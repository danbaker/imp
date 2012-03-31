// EVENTS:
//  PlayerLeaving
//  PlayerExited
//  PlayerEntered
//  PlayerStanding

ig.module(
	'game.hexcell'
)
.requires(
	'impact.game',
    'game.utanim',
    'game.utpubsub'
)
.defines(function(){

HexCell = ig.Class.extend({
	
    brdType: {},                    // enumerations of the available types (.EDGE = 0)
    brdData: [],                    // brdData[0] = the default board-data for a "0" (Mountain/Edge)
    brdImages: [],                  // array of images
    pubsub: UT.PubSub.getInstance(),
    hexboard: null,                 // the board delegate object
    player: null,                   // the player delegate object (hex cells call this to find out about the current board state)


	
	init: function(hexboard) {
        if (hexboard) {
            this.hexboard = hexboard;
            this.loadImages();
            this.buildTypes();
        }
	},

    setPlayerDelegate: function(plyr) {
        this.player = plyr;
    },

    loadImages: function() {

        this.brdType.EDGE = 0;          // edge of the board.  solid. can't edit or move.
        this.brdType.MOUNTAIN = 1;      // standard mountain.  solid,
        this.brdType.FLOOR = 2;         // standard floor.
        this.brdType.START = 3;         // THE one-and-only start location
        this.brdType.FINISH = 4;        // THE one-and-only finish location
        this.brdType.SWITCH = 5;        // on/off switch (stays in up or down position)
        this.brdType.WALL = 6;          // up-and-down wall
        this.brdType.PLATE = 7;         // on.off plate-switch (only down if something is ON the plate)

        this.imgSwitch = new ig.AnimationSheet( 'media/hexRowSwitch.png', 56, 65 );
        this.imgWall = new ig.AnimationSheet( 'media/hexRowWall.png', 56, 65 );
        this.imgPlate = new ig.AnimationSheet( 'media/hexRowPlate.png', 56, 65 );
        this.brdImages[this.brdType.MOUNTAIN] = new ig.Image('media/hexMtn.png');
        this.brdImages[this.brdType.FLOOR] = new ig.Image('media/hex2.png');
    },

    // build/create the entire set/collection of constant board-data information
    // like: "SWITCH w/ two animations"
    buildTypes: function() {
        var self = this;

        var t = this.brdType;
        this.brdData = [
            { type: t.EDGE, id: 0, solid:true },
            { type: t.MOUNTAIN, id: t.MOUNTAIN, solid:true },
            { type: t.FLOOR, id: t.FLOOR },
            { type: t.START, id: t.FLOOR },
            { type: t.FINISH, id: t.FLOOR },
            { type: t.SWITCH, id: t.FLOOR, down:true,
                operate: [],    // array of hex-positions that this switch "operates"
                build: function() {
                    this.anim1 = new UT.Anim( self.imgSwitch, 0.03, [3,2,1,0,1,2,3,4,5,6,7,8], true, "SwitchUp" );
                    this.anim2 = new UT.Anim( self.imgSwitch, 0.03, [8,7,6,5,4,3,2,1,0,1,2,3], true, "SwitchDown" );
                    this.anim = this.down? this.anim2 : this.anim1;
                    //this.anim.gotoFrame(20);                      // start switch at the ending-anim (already depressed)
                },
                event_PlayerEntered: function() {
                    this.down = !this.down;
                    if (this.down) {
                        this.anim = this.anim2;         // anim2 shows the switch down/depressed
                    } else {
                        this.anim = this.anim1;
                    }
                    this.anim.gotoFrame(0);
                    this.anim.rewind();
                    this.anim.start();          // fire "animation started event"
                },
                event_SwitchUp: function(data) {
                    if (data.done) {
                        self.log("Switch is now UP");
                        self.fireCode("Operate", this, "up");
                    }
                },
                event_SwitchDown: function(data) {
                    if (data.done) {
                        self.log("Switch is now DOWN");
                        self.fireCode("Operate", this, "down");
                    }
                }
            },
            { type: t.WALL, id: t.FLOOR, down:true, solid:true,
                build: function() {
                    this.anim1 = new UT.Anim( self.imgWall, 0.15, [0,1,2,3,4,5,6,7,8,9], true, "WallUp" );
                    this.anim2 = new UT.Anim( self.imgWall, 0.15, [9,8,7,6,5,4,3,2,1,0], true, "WallDown" );
                    this.anim = this.down? this.anim2 : this.anim1;
                    //this.anim.gotoFrame(20);
                },
                event_WallUp: function(data) {
                    this.solid = true;                  // if wall is started up, or finished up -- solid wall
                },
                event_WallDown: function(data) {
                    if (data.done) {
                        this.solid = false;             // when wall is all the way down -- not solid
                    }
                },
                event_PlayerLeaving: function() {
                    console.log("***** Plaer Leaving WALL *****  doLater_up="+this.doLater_up);
                    if (this.doLater_up) {
                        this.doOperate_upNow();
                    }
                },
                doOperate_up: function() {
                    if (this.isPlayerOn()) {
                        // Hard Case: player is ON-or-headed-to this cell.  Can't put up wall (yet)
                        this.doLater_up = true;
                    } else {
                        this.doOperate_upNow();
                    }
                },
                doOperate_upNow: function() {
                    //console.log("operate UP NOW");
                    this.down = false;
                    this.doLater_up = false;
                    this.restartAnim();
                },
                doOperate_down: function() {
                    //console.log("operate DOWN");
                    this.down = true;
                    this.restartAnim();
                },
                restartAnim: function() {
                    this.anim = this.down? this.anim2 : this.anim1;
                    this.anim.gotoFrame(0);
                    this.anim.rewind();
                    this.anim.start();          // fire "animation started event"
                }
            },
            { type: t.PLATE, id: t.FLOOR, down:true,
                operate: [],    // array of hex-positions that this switch "operates"
                build: function() {
                    this.anim1 = new UT.Anim( self.imgPlate, 0.03, [0,1,2,3,4], true, "SwitchUp" );
                    this.anim2 = new UT.Anim( self.imgPlate, 0.03, [4,3,2,1,0], true, "SwitchDown" );
                    this.anim = this.down? this.anim2 : this.anim1;
                    //this.anim.gotoFrame(20);                      // start switch at the ending-anim (already depressed)
                },
                event_PlayerEntered: function() {
                    this.down = true;
                    this.anim = this.anim2;         // anim2 shows the switch down/depressed
                    this.anim.gotoFrame(0);
                    this.anim.rewind();
                    this.anim.start();          // fire "animation started event"
                },
                event_PlayerExited: function() {
                    this.down = false;
                    this.anim = this.anim1;         // anim2 shows the switch down/depressed
                    this.anim.gotoFrame(0);
                    this.anim.rewind();
                    this.anim.start();          // fire "animation started event"
                },
                event_SwitchUp: function(data) {
                    if (data.done) {
                        self.log("Switch is now UP");
                        self.fireCode("Operate", this, "up");
                    }
                },
                event_SwitchDown: function(data) {
                    if (data.done) {
                        self.log("Switch is now DOWN");
                        self.fireCode("Operate", this, "down");
                    }
                }
            },
            { }
        ];
        this._prepareBrdData();
    },
    // add common functions to every board-data item
    _prepareBrdData: function() {
        var idx,
            bd,
            self = this;

        for(idx=0; idx<this.brdData.length; idx++) {
            bd = this.brdData[idx];
            bd.isPlayerOn = function() {
                // return false if player is NOT on (or walking into) this hex-cell
                return (self.player.isPlayerOn(this) || self.player.isPlayerHeadedTo(this));
            }
        }
    },
    // fire/run a chunk of code on a known hex-board-data
    fireCode: function(fncName, brdData, data) {
        var fnc = "fireCode_"+fncName;
        //console.log("fireCode.  fnc="+fnc);
        if (this[fnc]) {
            this[fnc](brdData, data);
        }
    },
    // process all "operate" hexes (dir="up" or "down")
    fireCode_Operate: function(brdData, dir) {
        //console.log(brdData.operate);
        if (brdData.operate) {
            for(var idx=0; idx<brdData.operate.length; idx++) {
                var bd = brdData.operate[idx];      // bd = 1 brdData to operate
                var fnc = "doOperate_"+dir;
                if(bd[fnc]) {
                    // run operation on another board-data
                    bd[fnc](brdData);
                }
            }
        }
    },

    log:function(msg) {
        console.log(msg);
    }

});


});
