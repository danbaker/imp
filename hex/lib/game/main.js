ig.module( 
	'game.main' 
)
.requires(
	'impact.game',
	'impact.font',
    'game.hexboard',
    'game.entities.player'
)
.defines(function(){

MyGame = ig.Game.extend({
	
	// Impact Properties
	font: new ig.Font( 'media/04b03.font.png' ),

    // HexGame Properties
    ticker: 0,
    hexboard: null,
    player: null,

    // Frames-Per-Second data
    fps_ts: 0,          // timestamp when starting counting frames
    fps_cnt: 0,         // total frames counted so far this second
    fps_n: 0,           // frames counted last second (display this number)
	
	init: function() {
		// Initialize your game here; bind keys etc.
        var pos;
        this.hexboard = new MyHexBoard();
        pos = this.hexboard.calcHexTop(4,5);
        pos = this.hexboard.calcHexCenter(pos);
        this.player = new EntityPlayer(pos.cx,pos.cy, {hexboard:this.hexboard} );
        ig.input.bind( ig.KEY.MOUSE1, 'leftClick' );
        ig.input.bind( ig.KEY.LEFT_ARROW, 'left' );
        ig.input.bind( ig.KEY.RIGHT_ARROW, 'right' );
        ig.input.bind( ig.KEY.A, 'dir1' );
        ig.input.bind( ig.KEY.W, 'dir2' );
        ig.input.bind( ig.KEY.E, 'dir3' );
        ig.input.bind( ig.KEY.D, 'dir4' );
        ig.input.bind( ig.KEY.X, 'dir5' );
        ig.input.bind( ig.KEY.Z, 'dir6' );
    },
	
	update: function() {
        var mx,my,
            pos;
		// Update all entities and backgroundMaps
		this.parent();

        // check and handle for user input
        if( ig.input.pressed('leftClick') ) {
            mx=ig.input.mouse.x;            // screen x,y of the mouse
            my=ig.input.mouse.y;
            pos = this.hexboard.findHexAt(mx,my);
            if (pos) {
                if (this.hexboard.isNext(pos, this.player.hexat)) {
                    this.player.moveToHex(pos);
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


		// Add your own drawing code here
//		var x = ig.system.width/2,
//			y = ig.system.height/2;
//        --this.ticker;
//        if (this.ticker < -10) this.ticker = 10;
//        if (this.ticker > 0) {
//    		this.font.draw( 'Hello world!', x, y, ig.Font.ALIGN.CENTER );
//        }
        this.font.draw( 'FPS:'+this.fps_n, 20, 750 );
        this.font.draw( ''+this.fps_n, 0, 370 );
	},

    tryMoveDir: function(dir) {
        console.log("Move direction: "+dir);
        var pos = { ix:this.player.hexat.ix, iy:this.player.hexat.iy };
        pos = this.hexboard.moveDir(pos, dir);
        this.player.moveToHex(pos);
    }
});


// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
ig.main( '#canvas', MyGame, 60, 1024, 768, 1 );

});
