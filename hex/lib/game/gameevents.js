
ig.module(
	'game.gameevents'
)
.requires(
    'game.utpubsub'
)
.defines(function(){

GameEvents = ig.Class.extend({
	
    hexboard: null,
    player: null,
    pubsub: UT.PubSub.getInstance(),
    subscribed: false,

	init: function(brd, playr) {
        var self = this;
        this.hexboard = brd;
        this.player = playr;
        if (!this.subscribed) {
            this.subscribed = true;

            // @TODO: allow for subscribing to "BRD:" or set a "class" on events
            this.pubsub.subscribe("BRD:PlayerLeaving", function(evt, data) {        // player start walking. will leave this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerExited", function(evt, data) {         // just crossed the edge out of this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerEntered", function(evt, data) {        // just crossed the edge into this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerStanding", function(evt, data) {       // just stopped in the center of this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("ANIM:SwitchUp", function(evt, data) {            // switch animation just completed.  Switch is now "UP"
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("ANIM:SwitchDown", function(evt, data) {          // switch anim just finished.  Switch is now "DOWN"
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("ANIM:SwitchToggle", function(evt, data) {        // switch animation just completed.  Switch was toggled
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("ANIM:WallUp", function(evt, data) {            // switch animation just completed.  Switch is now "UP"
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("ANIM:WallDown", function(evt, data) {          // switch anim just finished.  Switch is now "DOWN"
                self.brdEvent(evt, data);
            });
        }
    },

    // a board-related event (like player just crossed an edge into a new hex)
    brdEvent: function(evt, data) {
        var pos = data.hex;                                 // board-hex event happened with
        var evtParts = evt.split(":");                      // [0]="BRD", [1]="PlayerEntered"
        var fncName = "event_"+evtParts[1];                 // "event_PlayerEntered"
        var brdData = this.hexboard.getBoardDataAt(pos);    // brdData = the hex this event happened in
        this.log("GameEvent: "+evt+" hex("+pos.ix+","+pos.iy+") "+(data.done?"DONE":"")+"  "+(data.start?"START":""));
        if (brdData) {
            if (brdData[fncName]) {
                // call event on the hex on the board
                brdData[fncName](data);
            }
        }
    },

    log: function(msg) {
        console.log(msg);
    }
});


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// *
// *        STATIC
// *

/**
 * To use the "main singleton"
 * @return {GameEvents}
 */
GameEvents.getInstance = function() {
    if (!GameEvents._singleton) {
        GameEvents._singleton = new GameEvents();
    }
    return GameEvents._singleton;
};


});
