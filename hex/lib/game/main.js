
UT = {};

ig.module(
	'game.main' 
)
.requires(
	'impact.game',
	'impact.font',
    'game.hexboard',
    'game.entities.player',
    'game.gameevents'
)
.defines(function(){

MyGame = ig.Game.extend({
	
	// Impact Properties
	font: new ig.Font( 'media/04b03.font.png' ),

    // HexGame Properties
    ticker: 0,
    hexboard: null,
    player: null,
    gameevents: null,

    // Frames-Per-Second data
    fps_ts: 0,          // timestamp when starting counting frames
    fps_cnt: 0,         // total frames counted so far this second
    fps_n: 0,           // frames counted last second (display this number)
	
	init: function() {
		// Initialize your game here; bind keys etc.
        var pos;
        this.hexboard = new MyHexBoard();
        pos = this.hexboard.calcHexTop(1,7);
        pos = this.hexboard.calcHexCenter(pos);
        this.player = new EntityPlayer(pos.cx,pos.cy, {hexboard:this.hexboard} );
        this.player.snapToHex(pos);
        ig.input.bind( ig.KEY.MOUSE1, 'leftClick' );
        ig.input.bind( ig.KEY.LEFT_ARROW, 'left' );
        ig.input.bind( ig.KEY.RIGHT_ARROW, 'right' );
        ig.input.bind( ig.KEY.A, 'dir1' );
        ig.input.bind( ig.KEY.W, 'dir2' );
        ig.input.bind( ig.KEY.E, 'dir3' );
        ig.input.bind( ig.KEY.D, 'dir4' );
        ig.input.bind( ig.KEY.X, 'dir5' );
        ig.input.bind( ig.KEY.Z, 'dir6' );
        this.gameevents = GameEvents.getInstance();
        this.gameevents.init(this.hexboard, this.player);

        this.UIimages = [];
        this.UIimages[0] = new ig.Image('media/hexCircle.png');
        this.UIimages[1] = new ig.Image('media/hexCircleOutside.png');

    },
	
	update: function() {
        var mx,my,
            pos,
            bd,
            idx,
            bas,
            t,
            pMoves = [];
		// Update all entities and backgroundMaps
		this.parent();

        // check and handle for user input
        if( ig.input.pressed('leftClick') ) {
            if (this.uiMoves) {
                this.handleUIClick();
            } else {
                mx=ig.input.mouse.x;            // screen x,y of the mouse
                my=ig.input.mouse.y;
                pos = this.hexboard.findHexAt(mx,my);
                if (pos) {
                    // make sure clicked-on hex is "next-to" the player
                    if (this.hexboard.isNext(pos, this.player.hexat)) {
                        bd = this.hexboard.getBoardDataAt(pos);
                        if (bd && bd.bases && bd.bases.length) {
                            t = this.hexboard.hexcell.baseType;
                            pMoves.push({action:"move_move", label:"Move"});                      // player MOVE into cell
                            for(idx=0; idx<bd.bases.length; idx++) {
                                bas = bd.bases[idx];                                // t.MOVE or t.ROTATE
                                switch (bas) {
                                    case t.MOVE:
                                        pMoves.push({action:"move_push", label:"Push"});          // player PUSH cell
                                        break;
                                    case t.ROTATE:
                                        pMoves.push({action:"move_rotateCW", label:"Right"});       // rotate cell clockwise
                                        pMoves.push({action:"move_rotateCCW", label: "Left"});      // rotate cell counter-clockwise
                                        break;
                                }
                            }
                            // @TODO: remove actions from the array that can't be done (i.e. can't push into a solid cell ...)
                            // TODO: create UI that will paint and mouse-clicks will interact with
                            this.uiMoves = pMoves;
                            this.hexboard.calcHexTop(pos);                  // pos.tx,pos.ty
                            pos.tx += this.hexboard.xAdd/2;                 // alter pixel position to be top/center
                            this.uiPos = pos;
                            console.log(this.uiMoves);
                        } else {
                            // just move the player to the cell clicked on
                            this.uiMoves = undefined;
                            this.player.moveToHex(pos);
                        }
                    }
                }
            }
        }
        // check for keyboard request to move in a given direction
        if (ig.input.pressed('dir1')) this.tryMoveDir(1);
        if (ig.input.pressed('dir2')) this.tryMoveDir(2);
        if (ig.input.pressed('dir3')) this.tryMoveDir(3);
        if (ig.input.pressed('dir4')) this.tryMoveDir(4);
        if (ig.input.pressed('dir5')) this.tryMoveDir(5);
        if (ig.input.pressed('dir6')) this.tryMoveDir(6);

		// Add your own, additional update code here
        this.hexboard.update();
        this.player.update();
	},

    // Note: this gets called every frame
	draw: function() {
        var ts;

        // calc frames-per-second
        this.fps_cnt++;                         // 1 more frame drawn
        ts = new Date().getTime();
        if (ts - this.fps_ts > 1000) {
            this.fps_n = this.fps_cnt;          // save "# of frames drawn last second"
            this.fps_cnt = 0;                   // reset counter
            this.fps_ts = ts;                   // start a new "1 second of counting"
        }

		// Draw all entities and backgroundMaps
		this.parent();
        this.hexboard.draw();
        this.player.draw();

        this.drawUI();

        this.font.draw( 'FPS:'+this.fps_n, 20, 750 );
        this.font.draw( ''+this.fps_n, 0, 370 );
	},

    drawUI: function() {
        this.hexboard.uiShowing = false;
        if (this.uiMoves && this.uiPos) {
            this.hexboard.uiShowing = true;
            var mx=ig.input.mouse.x,                    // screen x,y of the mouse
                my=ig.input.mouse.y,
                i,
                img = this.UIimages[0],
                imgRing = this.UIimages[1],
                imgWidth = img.width,
                imgWidthX = imgWidth + 5,
                imgHeight = img.height,
                mov,
                dx = -(imgWidthX * (this.uiMoves.length-1) + imgWidth) / 2,
                dy = -60,
                xx,
                yy,
                dist;

            for(i=0; i<this.uiMoves.length; i++) {
                mov = this.uiMoves[i];
                mov.tx = this.uiPos.tx+dx;              // top.left (x,y)
                mov.ty = this.uiPos.ty+dy;
                mov.cx = mov.tx + imgWidth/2;           // center (x,y)
                mov.cy = mov.ty + imgHeight/2;
                img.draw(mov.tx, mov.ty);
                this.font.draw(mov.label, mov.cx, mov.cy-this.font.height/2, ig.Font.ALIGN.CENTER);
                xx = (mx - mov.cx);
                yy = (my - mov.cy);
                dist = (xx*xx + yy*yy);                 // distance-squared mouse is from center of this "move action"
                mov.selected = false;
                if (dist < (imgWidth/2)*(imgWidth/2)) {
                    mov.selected = true;                    // mouse is hovering over this UI element
                    imgRing.draw(mov.tx, mov.ty);           // draw a special "ring" around this UI element
                }

                dx += imgWidthX;
            }
        }
    },
    handleUIClick: function() {
        var i,
            mov;
        for(i=0; i<this.uiMoves.length; i++) {
            mov = this.uiMoves[i];
            if (mov.selected) {
                console.log("User Clicked on element: "+mov.action);
            }
        }
        this.uiMoves = null;
    },

    tryMoveDir: function(dir) {
        console.log("Move direction: "+dir);
        var pos = { ix:this.player.hexat.ix, iy:this.player.hexat.iy };
        pos = this.hexboard.moveDir(pos, dir);
        this.player.moveToHex(pos);
    },


    // // // // // // // // //
    //
    //  UTILITIES   ...   access via ig.game.random(100)
    //

    // get a random number
    // in: max (if left off, get a number between 0 and 1) else between 0 and max-1
    random: function(max) {
        if (max === undefined) {
            return Math.random();
        }
        return Math.floor(Math.random() * max);
    }

});


// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
ig.main( '#canvas', MyGame, 60, 1024, 768, 1 );

});
