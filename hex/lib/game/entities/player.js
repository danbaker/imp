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
    offset: {x: 4, y: 2},
    flip: false,
    maxVel: {x: 150, y: 150},

    // HexGame properties (nx,ny) is hex-number, (cx,cy) is center-pixel
    hexboard: null,
    hexpos: {ix: 1, iy: 1, cx: 10, cy: 20},
    hexdest: null,

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
        this.pos.x = x - 4;
        this.pos.y = y - 5;
    },

    update: function() {
        // move left or right
        var accel = 200;//this.standing ? this.accelGround : this.accelAir;
        if( ig.input.state('left') ) {
            this.accel.x = -accel;
            this.flip = true;
            this.currentAnim = this.anims.run;
        }else if( ig.input.state('right') ) {
            this.accel.x = accel;
            this.flip = false;
            this.currentAnim = this.anims.run;
        }else{
            this.accel.x = 0;
            this.vel.x = 0;
            this.currentAnim = this.anims.idle;
        }
        // jump
        if( this.standing && ig.input.pressed('jump') ) {
            this.vel.y = -this.jump;
        }

        // move!
        this.currentAnim.flip.x = this.flip;
        this.parent();
    },

    // select a hex to move this player to
    moveToHex: function(pos,iy) {
        if (iy !== undefined) {
            pos = {ix:pos, iy:iy};                  // ix,iy
        }

        if (!this.hexdest) {
            // TODO: IF don't have a destination, THEN change
            // TODO: IF have a destination AND new destination is "from destination" (go back) THEN change
            this.hexboard.calcHexTop(pos);              // tx,ty
            this.hexboard.calcHexCenter(pos);           // cx,cy
            this.hexpos = pos;

            // TODO: TESTING
            this.setPos(pos.cx, pos.cy);
        }
    }

});

});