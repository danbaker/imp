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
    hexboard: null,


	
	init: function(hexboard) {
        if (hexboard) {
            this.hexboard = hexboard;
            this.loadImages();
            this.buildTypes();
        }
	},

    loadImages: function() {

        this.brdType.EDGE = 0;          // edge of the board.  solid. can't edit or move.
        this.brdType.MOUNTAIN = 1;      // standard mountain.  solid,
        this.brdType.FLOOR = 2;         // standard floor.
        this.brdType.START = 3;         // THE one-and-only start location
        this.brdType.FINISH = 4;        // THE one-and-only finish location
        this.brdType.SWITCH = 5;        // on/off switch plate
        this.brdType.WALL = 6;          // up-and-down wall

        this.imgSwitch = new ig.AnimationSheet( 'media/hexRowSwitch.png', 56, 65 );
        this.imgWall = new ig.AnimationSheet( 'media/hexRowWall.png', 56, 65 );
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
                doOperate_up: function() {
                    //console.log("operate UP");
                    this.down = false;
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
            { }
        ];
    },
    // fire/run a chunk of code on a known hex-board-data
    fireCode: function(fncName, brdData, data) {
        var fnc = "fireCode_"+fncName;
        console.log("fireCode.  fnc="+fnc);
        if (this[fnc]) {
            this[fnc](brdData, data);
        }
    },
    // process all "operate" hexes (dir="up" or "down")
    fireCode_Operate: function(brdData, dir) {
        console.log(brdData.operate);
        if (brdData.operate) {
            for(var idx=0; idx<brdData.operate.length; idx++) {
                var pos = brdData.operate[idx];
                var op = this.hexboard.getBoardDataAt(pos);      // op = 1 brdData to operate
                var fnc = "doOperate_"+dir;
                console.log(op);
                if(op[fnc]) {
                    // run operation on another board-data
                    op[fnc](brdData);
                }
            }
        }
    },

    log:function(msg) {
        console.log(msg);
    }

});


});
