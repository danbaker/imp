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
    baseType: {},                   // enumerations of the possible bases {.MOVE, .ROTATE)
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

        this.brdType.MOVE = 101;
        this.brdType.ROTATE = 102;
        this.brdType.KICK = 103;

        this.baseType.MOVE = this.brdType.MOVE;         // this brd cell can be moved(pushed) around by the player
        this.baseType.ROTATE = this.brdType.ROTATE;     // this brd cell can be rotate by the player
        this.baseType.KICK = this.brdType.KICK;         // this brd cell can be kicked by the player

        this.imgSwitch = new ig.AnimationSheet( 'media/hexRowSwitch.png', 56, 65 );
        this.imgWall = new ig.AnimationSheet( 'media/hexRowWall.png', 56, 65 );
        this.imgPlate = new ig.AnimationSheet( 'media/hexRowPlate.png', 56, 65 );
        this.brdImages[this.brdType.MOUNTAIN] = new ig.Image('media/hexMtn.png');
        this.brdImages[this.brdType.FLOOR] = new ig.Image('media/hex2.png');

        this.brdImages[this.brdType.MOVE] = new ig.Image('media/hexMove.png');
        this.brdImages[this.brdType.ROTATE] = new ig.Image('media/hexRotate.png');
        this.brdImages[this.brdType.KICK] = new ig.Image('media/hexKick.png');
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
                build: function() {
                    this.anim_StepOnWasUp     = new UT.Anim( self.imgSwitch, 0.03, [8,7,6,5,4,3,2,1,0],  true, "SwitchStepOnWasUp" );
                    this.anim_StepOnWasDown   = new UT.Anim( self.imgSwitch, 0.03, [3,2,1,0],            true, "SwitchStepOnWasDown" );
                    this.anim_StepOffStayDown = new UT.Anim( self.imgSwitch, 0.03, [0,1,2,3],            true, "SwitchStepOffStayDown" );
                    this.anim_StepOffGoUp     = new UT.Anim( self.imgSwitch, 0.03, [0,1,2,3,4,5,6,7,8],  true, "SwitchStepOffGoUp" );
                    this.anim = this.down? this.anim_StepOffStayDown : this.anim_StepOffGoUp;
                    this.anim.gotoFrame(20);                      // start switch at the ending-anim (already depressed)
                },
                event_HexEntered: function() {
                    this.event_PlayerEntered();
                },
                event_HexLeavingCenter: function() {
                    this.event_PlayerLeaving();
                },
                event_PlayerEntered: function() {
                    this.startAnim(this.down? this.anim_StepOnWasDown : this.anim_StepOnWasUp);
                },
                event_PlayerLeaving: function() {
                    if (this.anim === this.anim_StepOnWasUp) {
                        this.startAnim(this.anim_StepOffStayDown);       // player stepping off Switch. switch was UP, will stay down
                    } else if (this.anim === this.anim_StepOnWasDown) {
                        this.startAnim(this.anim_StepOffGoUp);           // player stepping off Switch. switch was DOWN, will go up now
                    }
                },
                event_SwitchUp: function(data) {        // OLD
                    if (data.done) {
                        this.down = false;                      // switch is now UP
                        this.checkSequences();
                    }
                },
                event_SwitchDown: function(data) {      // OLD
                    if (data.done) {
                        this.down = true;                       // switch it now DOWN
                        this.checkSequences();
                    }
                },
                event_SwitchStepOnWasUp: function(data) {
                    if (data.done) {
                        // Player already stepped onto a switch which was UP. Switch finished animating to the DOWN position.
                        console.log("Switch now DOWN.  checking sequences");
                        this.down = true;                       // switch is now DOWN
                        this.checkSequences();
                    }
                },
                event_SwitchStepOffGoUp: function(data) {
                    if (data.done) {
                        // Player has left the hex. Switch has animated all the way UP.
                        console.log("Switch now UP.  checking sequences");
                        this.down = false;
                        this.checkSequences();
                    }
                }
            },
            { type: t.WALL, id: t.FLOOR, down:true, solid:true,
                build: function() {
                    this.anim_1 = new UT.Anim( self.imgWall, 0.15, [0,1,2,3,4,5,6,7,8,9], true, "WallUp" );
                    this.anim_2 = new UT.Anim( self.imgWall, 0.15, [9,8,7,6,5,4,3,2,1,0], true, "WallDown" );
                    this.anim = this.down? this.anim_2 : this.anim_1;
                    this.anim.gotoFrame(20);
                },
                event_WallUp: function(data) {
                    this.solid = true;                  // if wall is started up, or finished up -- solid wall
                    this.checkSequences();
                },
                event_WallDown: function(data) {
                    if (data.done) {
                        this.solid = false;             // when wall is all the way down -- not solid
                        this.checkSequences();
                    }
                },
                event_PlayerLeaving: function() {
                    if (this.doLater_up) {
                        this.doOperate_upNow();
                    }
                },
                doOperate_up: function() {
                    if (this.down) {
                        if (this.isPlayerOn()) {
                            // Hard Case: player is ON-or-headed-to this cell.  Can't put up wall (yet)
                            this.doLater_up = true;
                        } else {
                            this.doOperate_upNow();
                        }
                    }
                },
                doOperate_upNow: function() {
                    this.down = false;
                    this.doLater_up = false;
                    this.checkSequences();
                    this.restartAnim();
                },
                doOperate_down: function() {
                    console.log("...doOperate_up  down="+this.down);
                    if (!this.down) {
                        this.down = true;
                        this.checkSequences();
                        this.restartAnim();
                    }
                },
                restartAnim: function() {
                    this.startAnim(this.down? this.anim_2 : this.anim_1);
                }
            },
            { type: t.PLATE, id: t.FLOOR, down:true,
                build: function() {
                    this.anim_1 = new UT.Anim( self.imgPlate, 0.03, [0,1,2,3,4], true, "SwitchUp" );
                    this.anim_2 = new UT.Anim( self.imgPlate, 0.03, [4,3,2,1,0], true, "SwitchDown" );
                    this.anim = this.down? this.anim_2 : this.anim_1;
                    //this.anim.gotoFrame(20);                      // start switch at the ending-anim (already depressed)
                },
                event_PlayerEntered: function() {
                    this.startAnim(this.anim_2);
                },
                event_PlayerLeaving: function() {
                    this.startAnim(this.anim_1);
                },
                event_PlayerExited: function() {
                    this.startAnim(this.anim_1);
                },
                event_SwitchUp: function(data) {
                    if (data.done) {
                        this.down = false;
                        this.checkSequences();
                    }
                },
                event_SwitchDown: function(data) {
                    if (data.done) {
                        this.down = true;
                        this.checkSequences();
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
            };
            bd.setPos = function(x,y) {
                if (this.anims) {
                    for(var i=0; i<this.anims.length; i++) {
                        this.anims[i].setPos(x,y);
                    }
                }
            };
            bd.startAnim = function(a, force) {
                if (this.anim !== a || force) {
                    // make sure to play the event of the current anim finishing
                    if (this.anim && this.anim.abortAnimNow) {
                        this.anim.abortAnimNow();
                    }
                    this.anim = a;
                    this.anim.gotoFrame(0);
                    this.anim.rewind();
                    this.anim.start();          // fire "animation started event"
                }
            };
            bd.checkSequences = function() {
                self.hexboard.checkSequences(this);
            };
        }
    },

    log:function(msg) {
        console.log(msg);
    }

});


});
