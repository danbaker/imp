ig.module(
	'game.entities.player'
)
.requires(
	'impact.entity'
)
.defines(function(){

EntityPlayer = ig.Entity.extend({

    // Impact Properties
    animSheet: new ig.AnimationSheet( 'media/player.png', 16, 16 ),
	size: {x:8, y:14},
    offset: {x: 6, y: 8},               // offset player to be centered in the hex
    flip: false,                        // true means walking left
    maxVel: {x: 350, y: 350},

    // HexGame properties (nx,ny) is hex-number, (cx,cy) is center-pixel
    hexboard: null,         // THE game board
    hexdest: null,          // an object that describes a destination heading to
    hexat: {ix: 5, iy: 5},  // where the player is at (IF !hexdest)

	init: function( x, y, settings ) {
		this.parent( x, y, settings );
        this.setPos(x,y);

        this.addAnim( 'idle', 1, [0] );
        this.addAnim( 'run', 0.07, [0,1,2,3,4,5] );
        this.addAnim( 'jump', 1, [9] );
        this.addAnim( 'fall', 0.4, [6,7] );

        this.hexboard = settings.hexboard;
	},


    setPos: function(x,y) {
        if (y === undefined) {
            y = x.cy;
            x = x.cx;
        }
        this.pos.x = x;
        this.pos.y = y;
    },

    update: function() {
        var dx,dy;
        // move left or right
        if (this.hexdest) {
            // player is moving toward a new hex ... check if arrived
            dx = this.hexdest.cx - this.pos.x;
            dy = this.hexdest.cy - this.pos.y;
            // check if arrived in any single direction.  if so, stop that direction and snap to right spot.
            if (dx < 0 && this.vel.x > 0) { this.vel.x = 0; this.pos.x = this.hexdest.cx; }
            if (dx > 0 && this.vel.x < 0) { this.vel.x = 0; this.pos.x = this.hexdest.cx; }
            if (dy < 0 && this.vel.y > 0) { this.vel.y = 0; this.pos.y = this.hexdest.cy; }
            if (dy > 0 && this.vel.y < 0) { this.vel.y = 0; this.pos.y = this.hexdest.cy; }
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                // arrived
                this.snapToHex(this.hexdest);
            }
        }
//        var accel = 200;//this.standing ? this.accelGround : this.accelAir;
//        if( ig.input.state('left') ) {
//            this.accel.x = -accel;
//            this.flip = true;
//            this.currentAnim = this.anims.run;
//        }else if( ig.input.state('right') ) {
//            this.accel.x = accel;
//            this.flip = false;
//            this.currentAnim = this.anims.run;
//        }else{
//            this.accel.x = 0;
//            this.vel.x = 0;
//            this.currentAnim = this.anims.idle;
//        }
//        // jump
//        if( this.standing && ig.input.pressed('jump') ) {
//            this.vel.y = -this.jump;
//        }

        // move!
        this.currentAnim.flip.x = this.flip;
        this.parent();
    },

    // select a hex to move this player to
    moveToHex: function(pos,iy) {
        var dx,dy,
            mult = 2;
        if (iy !== undefined) {
            pos = {ix:pos, iy:iy};                  // ix,iy
        }

        if (!this.hexdest) {
            // TODO: IF don't have a destination, THEN change
            // TODO: IF have a destination AND new destination is "from destination" (go back) THEN change
            this.hexboard.calcHexTop(pos);              // tx,ty
            this.hexboard.calcHexCenter(pos);           // cx,cy
            this.hexdest = pos;                         // {ix,iy, tx,ty, cx,cy}
            this.accel.x = 0;
            this.accel.y = 0;
            dx = pos.cx - this.pos.x;
            dy = pos.cy - this.pos.y;
            this.vel.x = dx * mult;
            this.vel.y = dy * mult;
            this.flip = (dx < 0);
            this.currentAnim = this.anims.run;
        }
    },

    snapToHex: function(pos) {
        this.setPos(pos);                   // place them EXACTLY in the right spot
        this.vel.x = 0;                     // stop them from moving
        this.vel.y = 0;
        this.hexat = pos;                   // save location at
        this.hexdest = undefined;           // clear the "destination hex"
        this.currentAnim = this.anims.idle; // stand still
    }

});

});
