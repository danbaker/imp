ig.module(
    'game.utpubsub'
)
.requires(
)
.defines(function(){

UT.PubSub = ig.Class.extend({


init: function() {
	// the collection of all events registered on this PubSub (key=eventID, value = object)
	this._events = {};			// eventID: { subscriptions:..., vetoers:..., slow:true }
	
	// collection of handles and objects (key is handle, value is eventObj)
	this._handles = {};			// eventHandle: { eventID:eventID, priority:N } --OR-- { eventID:eventID, veto:true }
	
	this._minPriAllowed = 0;			// minimum possible priority
	this._maxPriAllowed = 9;			// maximum possible priority
	this._defaultPri = 5;				// default priority
    
	// slow-connection delegate info
	this._slowFn = null;		// function to call
	this._slowObj = null;		// object to call function on
	
	// a unique value to identify subscribed-to events (key into _handles)
	if (!UT.PubSub._nextHandle) {
		UT.PubSub._nextHandle = 1;
	}
},

/**
 * Set the delegate to handle the slow-connection (e.g. socket connection to a server)
 * NOTE: function({publish:true}, eventID, {args...})
 * @param (Function) fn  The function to call to handle calls to the server
 * @param {Object=} obj  The object that the function is a part of (the "this" ptr for the function)
 */
setSlowDelegate: function(fn, obj) {
	this._slowFn = fn;
	this._slowObj = obj;
},

/**
 * Subscribe to an event by name
 * @param {*} eventID  The id(name) of the event to listen/watch for (usually a string)
 * @param (Function) fn  The function to call when the eventID is published/fired
 * @param {Object=} obj  The object that the function is a part of (the "this" ptr for the function)
 * @param {Number=} priorty  Way of ordering who gets informed of the event first or last (defaults to 5, valid 0-9)
 * @return {*}  Handle to your subscribed-to event
 */
subscribe: function(eventID, fn, obj, priority) {
	this.log("subscribe to "+eventID);
	var returnHandle;
	var evt;
	var evtData;
	// crop priority within allowed limits
	if (!priority || typeof priority != 'number') priority = this._defaultPri;
	if (priority < this._minPriAllowed) priority = this._minPriAllowed;
	if (priority > this._maxPriAllowed) priority = this._maxPriAllowed;

	// create handle data to return
	returnHandle = this.getNextHandle();
	evtData = {priority:priority, eventID:eventID};	// eventID:eventID, priority:N
	this._handles[returnHandle] = evtData;

	// 1) find or create the event
	evt = this._createEvent(eventID);
	
	// 2) add to subscriber list of the event
	if (!evt.subscribers.pri[priority]) {
		evt.subscribers.pri[priority] = [];
	}
	evt.subscribers.pri[priority].push( {fn:fn, obj:obj, handle:returnHandle} );
	// set min/max suscribed priorities
	if (priority < evt.subscribers.minPri) evt.subscribers.minPri = priority;
	if (priority > evt.subscribers.maxPri) evt.subscribers.maxPri = priority;

	return returnHandle;
},

/**
 * Subscribe to an event by name (via a known slow-connection, like socket)
 * Note: when this eventID is published, it will also be published via the slow-connection
 * @param {*} eventID  The id(name) of the event to pass to the known slow-connection)
 */
subscribeSlow: function(eventID) {
	var evt;
	// 1) find or create the event
	evt = this._createEvent(eventID);
	evt.slow = true;
},

/**
 * Subscribe to an event, knowing response time is slow (e.g. over a socket connection)
 * @param {string} eventID  The eventID attach more classes to
 * @param {string|Array.<string>} cls  The class (or classes) to attach to the eventID
 */
attachClassToEvent: function(eventID, cls) {
	if (typeof cls === 'string') {
		var evt;
		// add this one class to this one event
		evt = this._createEvent(eventID);
		if (!evt.classes) {
			evt.classes = {};				// collection of class names attached to this event
		}
		evt.classes[cls] = cls;				// classes.class1 = "class1"
		// @TODO: IF this class is marked for "toSlow" then send this class over the slow
	} else {
		// iterate over the array, and add each single item
		var i;
		for(i=0; i<cls.length; i++) {
			this.attachClassToEvent(eventID, cls[i]);
		}
	}
},

/**
 * get the collection of classes attached to an eventID
 * Note: the returned collection IS the actual event classes collection, please do not modify it
 * @param {string} eventID  The eventID to get the collection of classes from
 * @return {Object}  An object containing all classes attached to the event (or undefined if event not defined)
 */
getEventClasses: function(eventID) {
	var evt;
	evt = this._events[eventID];		// find the requeste event
	if (!evt) {
		return undefined;				// event does not exist, return undefined
	}
	if (evt.classes) {
		return evt.classes;				// event exists and has classes attached, return them
	}
	return {};							// event exists but has no attached classes, return empty collection
},

/**
 * UNSubscribe to an event by name (via a known slow-connection, like socket)
 * Note: stop passing this event to the slow-connection
 * @param {*} eventID  The id(name) of the event to STOP passing to the known slow-connection)
 */
unsubscribeSlow: function(eventID) {
	var evt;
	// 1) find or create the event
	evt = this._createEvent(eventID);
	evt.slow = undefined;
},

/**
 * Setup to allow veto-power over a published event (allows for cancelling of events)
 * @param {*} eventID  The id(name) of the event to listen/watch for (usually a string)
 * @param {Function} fn  The function to call to check if the event should be veto'ed
 * @param {Object=} obj  The object that the function is a part of (the "this" ptr for the function)
 * example:  var doVeto = fn("eventA", justChecking);
 *		justChecking = a boolean.  true means someone called checkEvent, not publish.
 */
addVetoCheck: function(eventID, fn, obj) {
	var evt;
	var evtData;
	var returnHandle = this.getNextHandle();	// get unique handle
	// 1) find or create the event
	evt = this._createEvent(eventID);
	if (!evt.vetoers) {
		evt.vetoers = [];					// collection of functions to call-on-publish to check for veto
	}
	// 2) add to veto list
	evt.vetoers.push( {fn:fn, obj:obj, handle:returnHandle} );
	// 3) save data into handles map
	evtData = {eventID:eventID, veto:true};	// eventID:eventID, veto:true
	this._handles[returnHandle] = evtData;
	
	return returnHandle;
},

removeVetoCheck: function(handle) {
	var evt;
	var evtData;
	var arr;
	var idx;
	// 1) find the veto data via the handle-map
	evtData = this._handles[handle];				// { eventID: eventID, veto:true }
	if (evtData) {
		// 2) find the event
		evt = this._events[evtData.eventID];
		if (evt && evt.vetoers) {
			// 3) walk the list of vetoers looking for specific handle
			arr = evt.vetoers;
			for(idx=0; idx<arr.length; idx++) {
				if (arr[idx].handle === handle) {
					// requested veto handle found
					if (arr.length <= 1) {
						// removing last vetoer
						delete evt.vetoers;
					} else {
						// remove this one vetoer from the array
						arr.splice(idx, 1);
					}
					// last) remove the handle data from _handles
					delete this._handles[handle];
					break;
				}
			}
		}
	}
},

/**
 * unsubscribe.  quit listening for an eventID
 * @param {*} handle  The event-handle to a previously subscribed-to event
 */
unsubscribe: function(handle) {
	var found;			// the found info object
	var evtData;		// the event data: { eventID:eventID, priority:N, evt:_events[eventID] }
	var priority;		// event priority
	var evt;			// the actual found event object: { subscribers:... }
	var arr;			// array of subscribers for this event and priority
	var idx;			// inex in array of the event to unsubscribe
	
	// 1) find event
	found = this._findEventViaHandle(handle);
	if (found) {
		evtData = found.evtData;
		// 2) remove "handle" from subscribers
		if (evtData && evtData.eventID) {
			evt = this._events[evtData.eventID];
			idx = found.idx;
			// .event:eventName, priority:N, .evt:_events[eventName]
			priority = evtData.priority;
			if (evt && evt.subscribers && evt.subscribers.pri && evt.subscribers.pri[priority]) {
				arr = evt.subscribers.pri[priority];
				if (arr.length <= 1) {
					// removing last subscriber of this event and priority, delete entire priority collection
					delete evt.subscribers.pri[priority];
					// TODO alter minPri or maxPri if can
				} else {
					// remove this one subscription from the array of this priority
					arr.splice(idx, 1);
				}
				// last) remove the handle data from _handles
				delete this._handles[handle];
			}
		}
	}
},

/**
 * check if an event will be processed (if the event has any subscribers and no vetoers)
 * @param {*} eventID  The event to check
 * @return {boolean}  true means the event IS VALID (someone is subscribed, and won't be veto'ed)
 *					  false means VETO'ED
 *					  null means "no one listening"
 */
checkEvent: function(eventID, args) {
this.log("checkEvent:  eventID="+eventID);
	var evt;				// event object
	var pri;				// collection of subscribers for a single priority
	var min;
	var max;
	var priority;			// a priority value
	var arr;				// array of subscribers for a single priority
	var idx;				// index into array
	var oneSub;				// one subscription object
	// 1) find event
	evt = this._events[eventID];
	if (evt && evt.subscribers && evt.subscribers.pri) {
		// check VETO
		if (evt.vetoers) {
			arr = evt.vetoers;
			// walk every function that asked to be checked for veto
			for(idx=0; idx<arr.length; idx++) {
				oneSub = arr[idx];
				if (oneSub && oneSub.fn) {
					// check if this one wants to veto
					if (oneSub.fn.call(oneSub.obj, eventID, args)) {
						// VETO'ED
						return false;
					}
				}
			}
		}
		min = evt.subscribers.minPri;		// minimum priority to check
		max = evt.subscribers.maxPri;		// maximum priority to check
		pri = evt.subscribers.pri;			// array to check based-on priority
		for(priority=min; priority<=max; priority++) {
			arr = pri[priority];			// array of subscribers for this one priority
			if (arr) {
				for(idx=0; idx<arr.length; idx++) {
					oneSub = arr[idx];
					if (oneSub && oneSub.fn) {
						// event has at least 1 subscriber and no on veto'ed it
						return true;
					}
				}
			}
		}
	}
	// IF slow has subscribed, return true
	if (evt && evt.slow) {
		return true;
	}
	return null;
},

/**
 * publish/trigger/fire an event
 * @param {*} eventID  The event to cause/publish/trigger/fire right now
 * @param {*} args  argument with the event (usually a JSON object)
 * @return {number}  The number of subscribers that got the event (0 means no one, -1 means it was veto'ed)
 */
publish: function(eventID, args) {
	var n = this.checkEvent(eventID, args);
this.log("publish: eventID="+eventID+"  check returned "+n);
	if (n === true) {
		return this.publishNow(eventID, args);	// n SUBSCRIBERS
		
	} else if (n === null) {
		return 0;								// NO SUBSCRIBERS
		
	} else {
		return -1;								// VETO'ED
	}
},

/**
 * publish/trigger/fire an event right now (assumes you already checked for veto)
 * @param {*} eventID  The event to cause/publish/trigger/fire right now
 * @param {*} args  argument with the event (usually a JSON object)
 * @param {boolean} slowOnly  true means: do NOT publish to slowConnection (will be handled elsewhere)
 * @return {number}  The number of subscribers that got the event (0 means no one)
 */
publishNow: function(eventID, args, localOnly) {
	var returnN = 0;		// total subscribers that got this event (-1 means it was veto'ed)
	var evt;				// event object
	var pri;				// collection of subscribers for a single priority
	var min;
	var max;
	var priority;			// a priority value
	var arr;				// array of subscribers for a single priority
	var idx;				// index into array
	var oneSub;				// one subscription-object
	// 1) find event
	evt = this._events[eventID];
	if (evt) {
		if (evt.subscribers && evt.subscribers.pri) {
			min = evt.subscribers.minPri;		// minimum priority to check
			max = evt.subscribers.maxPri;		// maximum priority to check
			pri = evt.subscribers.pri;			// array of subscribers ordered by priority
			// walk every priority
			for(priority=min; priority<=max; priority++) {
				arr = pri[priority];
				if (arr) {
					// walk every subscription in this priority
					for(idx=0; idx<arr.length; idx++) {
						oneSub = arr[idx];
						if (oneSub && oneSub.fn) {
							oneSub.fn.call(oneSub.obj, eventID, args);
							returnN += 1;
						}
					}
				}
			}
		}
		if (evt.slow && this._slowFn && !localOnly) {
			this._slowFn.call(this._slowObj, {publish:true}, eventID, args);
			returnN += 1;
		}
	}
	return returnN;
},

/**
 * check if a given event will be published to the slowConnection
 * @param {*} eventID  The event to check
 * @param {*} args  argument with the event (usually a JSON object)
 * @return {number}  0 means NOT sent to slowConnection.  1 means WILL publish to slowConnection
 */
checkPublishSlow: function(eventID, args, localOnly) {
	var returnN = 0;		// total subscribers that got this event (-1 means it was veto'ed)
	var evt;				// event object
	// 1) find event
	evt = this._events[eventID];
	if (evt) {
		if (evt.slow && this._slowFn) {
			returnN += 1;
		}
	}
	return returnN;
},

/**
 * walk all events, and remove any events that have no subscribers and no veto'ers
 * Note: this function is useful when dynamic events are created, and they are temporary
 * @return  The total number of events that were removed
 */
removeEmptyEvents: function() {
	var nRemoved = 0;		// total events removed
	var eventID;			// ID of event to check for removal
	var evt;				// evt data of event to check:    { subscribers: {}, vetoers: [] }
	var pri;				// collection of subscribers for a single priority
	var priority;			// a priority value
	var arr;				// array of subscribers for a single priority
	var idx;				// index into array
	var maxPri;				// length of the priority array
	var oneSub;				// one subscription-object
	var removeNow;			// true means to remove the current event
	var toRemove = [];		// collection of all eventID's to remove
	for(eventID in this._events) {
		if (this._events.hasOwnProperty(eventID)) {
			evt = this._events[eventID];
			if (!evt.vetoers || evt.vetoers.length === 0) {
				// no veto'ers ... 
				// check if event is being published to a slow-connection
				if (!evt.slow) {
					// check if any subscribers
					removeNow = true;
					pri = evt.subscribers.pri;
					// walk every priority
					maxPri = pri.length;
					for(priority=0; priority<maxPri; priority++) {
						arr = pri[priority];
						if (arr && arr.length > 0) {
							removeNow = false;
							break;
						}
					}
					if (removeNow) {
						nRemoved++;
						toRemove.push(eventID);
					}
				}
			}
		}
	}
	for(idx=0; idx<toRemove.length; idx++) {
		delete this._events[toRemove[idx]];
	}
	return nRemoved;
},

/**
 * find information, given an event handle
 * @private
 * @param {*} handle  The event-handle to a previously subscribed-to event
 * @return {?Object}  {  evtData:eventData, idx: index of this handle in the array }
 */
_findEventViaHandle: function(handle) {
	var found = undefined;
	var evtData = this._handles[handle];		// { eventID:eventID, priority: N }
	var eventID;								// string (name of the event)
	var evt;									// event object { subscribers: }
	var priority;								// number priority of the requested event
	var arr;									// array of subscriptions to event with this priority
	var idx;									// index in array of this specific subscription-handle
	if (evtData) {
		// create the found-object to return
		found = {};
		found.evtData = evtData;
		eventID = evtData.eventID;
		evt = this._events[eventID];
		priority = evtData.priority;
		arr = evt.subscribers.pri[priority];
		if (arr) {
			// WALK the array looking for handle
			for(idx=0; idx<arr.length; idx++) {
				if (arr[idx].handle === handle) {
					// FOUND
					found.idx = idx;
					break;
				}
			}
		}
	}
	return found;
},

/**
 * make sure that an event exists, given an eventID
 * @param {*} eventID  The event to cause/publish/trigger/fire right now
 * @return {*} evt  The event data (either created or just returned)
 */
_createEvent: function(eventID) {
	var evt;
	// 1) find or create the event
	evt = this._events[eventID];
	if (!evt) {
		// not found, create the event
		this._events[eventID] = {};
		evt = this._events[eventID];
		evt.subscribers = {};							// collection of functions to call-on-publish
		evt.subscribers.pri = [];						// priority-ordered functions
		evt.subscribers.minPri = this._maxPriAllowed;	// smallest priority of any subscribed-to event
		evt.subscribers.maxPri = this._minPriAllowed;	// largest priority of any subscribed-to event
		//evt.vetoers = [];								// collection of functions to call-on-publish to check for veto (created on first veto added)
		//evt.classes = {};								// collection of class names attached to this event
	}
	return evt;
},

/**
 * get the next available handle id
 * Note: the handles are unique over the entire application
 * @return {number}  The handle to use
 */
getNextHandle: function(e) {
	var hand = UT.PubSub._nextHandle;
	UT.PubSub._nextHandle++;
	return hand;
},

/**
 * dump the entire subscription info to the console
 */
debugDump: function() {
	var eventID;			// a single eventID
	var evt;				// event object
	var pri;				// collection of subscribers for a single priority
	var priority;			// a priority value
	var arr;				// array of subscribers for a single priority
	var idx;				// index into array
	var key;				// key in an object collection
	var oneSub;				// one subscription-object
	var handle;				// handle to a single subscription
	var evtData;			// { eventID:eventID, priority: N }
	// EVENTS
	console.log("PubSub EVENTS:");
	for(eventID in this._events) {
		if (this._events.hasOwnProperty(eventID)) {
			console.log(".. eventID:"+eventID);
			evt = this._events[eventID];
			if (evt && evt.subscribers && evt.subscribers.pri) {
				pri = evt.subscribers.pri;
				// walk every priority
				for(priority in pri) {
					if (pri.hasOwnProperty(priority)) {
						console.log(".. .. priority:"+priority);
						arr = pri[priority];
						// walk every subscription in this priority
						for(idx=0; idx<arr.length; idx++) {
							oneSub = arr[idx];
							console.log(".. .. .. "+idx+":  handle="+oneSub.handle);
						}
					}
				}
			}
			if (evt && evt.classes) {
				console.log(".. .. CLASSES:");
				// walk collection of classes
				for(key in evt.classes) {
					if (evt.classes.hasOwnProperty(key)) {
						console.log(".. .. .. "+key);
					}
				}
			}
			if (evt && evt.vetoers) {
				console.log(".. .. VETOERS:");
				arr = evt.vetoers;
				// walk list of vetoers
				for(idx=0; idx<arr.length; idx++) {
					oneSub = arr[idx];
					console.log(".. .. .. "+idx+":  handle="+oneSub.handle);
				}
			}
			if (evt && evt.slow) {
				console.log(".. .. PUBLISH TO SLOW");
			}
		}
	}
	// HANDLES
	console.log("PubSub HANDLES: ");
	for(handle in this._handles) {
		if (this._handles.hasOwnProperty(handle)) {
			evtData = this._handles[handle];			// { eventID:eventID, priority: N }			
			console.log(".. handle:"+handle+"  eventID="+evtData.eventID+"  priority="+evtData.priority+"  veto="+evtData.veto);
		}
	}
	// OTHER
	if (this._slowFn) {
		console.log("PubSub has a slow-connection-delegate installed" + (this._slowObj? " with an object" : ""));
	}
},
log: function(msg) {
	//console.log(msg);
}

});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// *
// *        STATIC
// *

/**
 * To use the "main singleton" PubSub
 * @return {UT.PubSub}
 */
UT.PubSub.getInstance = function() {
    if (!UT.PubSub._singleton) {
        UT.PubSub._singleton = new UT.PubSub();
    }
    return UT.PubSub._singleton;
};

});