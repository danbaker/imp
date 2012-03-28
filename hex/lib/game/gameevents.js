
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

            this.pubsub.subscribe("BRD:PlayerLeaving", function(evt, data) {        // player start walking. will leave this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerExited", function(evt, data) {         // just crossed the edge out of this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerEntered", function(evt, data) {        // just crossed the edge into this hex
                self.brdEvent(evt, data);
            });
            this.pubsub.subscribe("BRD:PlayerStanding", function(evt, data) {       // ust stopped in the center of this hex
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
        this.log("GameEvent: "+evt+" hex("+pos.ix+","+pos.iy+")");
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
