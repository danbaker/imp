ig.module(
	'game.entities.player'
)
.requires(
	'impact.entity',
    'game.utpubsub'
)
.defines(function(){

EntityPlayer = ig.Entity.extend({

    // Impact Properties
    animSheet: new ig.AnimationSheet( 'media/player.png', 16, 16 ),
	size: {x:8, y:14},
    offset: {x: 6, y: 8},               // offset player to be centered in the hex
    flip: false,                        // true means walking left
    maxVel: {x: 350, y: 350},
    pubsub: UT.PubSub.getInstance(),


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
        this.hexboard.hexcell.setPlayerDelegate(this);
	},


    setPos: function(x,y) {
        if (y === undefined) {
            y = x.cy;
            x = x.cx;
        }
        this.pos.x = x;
        this.pos.y = y;
    },

    // check if the player is currently ON a board-data-hex-cell
    isPlayerOn: function(bd) {
        var pdb = this.hexboard.getBoardDataAt(this.hexat);
        return pdb === bd;
    },
    isPlayerHeadedTo: function(bd) {
        if (this.hexdest) {
            var pdb = this.hexboard.getBoardDataAt(this.hexdest);
            return pdb === bd;
        }
        return false;
    },

    update: function() {
        var dx,dy;
        // IF player is moving:
        if (this.hexdest) {
            // player is moving toward a new hex ... perorm checks
            // 1) check if player is at the point of leaving original hex and entering destination hex (board state changes)
            if (!this.hexdest.entered && !this.hexboard.isPointInHex(this.pos.x,this.pos.y,this.hexat)) {
                // LEFT the original hex / ENTERED the destination hex
                this.hexdest.entered = true;
                this.pubsub.publish("BRD:PlayerExited", {hex:this.hexat});
                this.pubsub.publish("BRD:PlayerEntered", {hex:this.hexdest});
            }
            // 2) check if player has arrived at the center of the destination hex (done moving)
            dx = this.hexdest.cx - this.pos.x;
            dy = this.hexdest.cy - this.pos.y;
            // check if arrived in any single direction.  if so, stop that direction and snap to right spot.
            if (dx < 0 && this.vel.x > 0) { this.vel.x = 0; this.pos.x = this.hexdest.cx; }
            if (dx > 0 && this.vel.x < 0) { this.vel.x = 0; this.pos.x = this.hexdest.cx; }
            if (dy < 0 && this.vel.y > 0) { this.vel.y = 0; this.pos.y = this.hexdest.cy; }
            if (dy > 0 && this.vel.y < 0) { this.vel.y = 0; this.pos.y = this.hexdest.cy; }
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                // arrived at the CENTER of the destination hex
                // player has just transitioned from current hex to a new hex
                this.snapToHex(this.hexdest);
            }
        }
        // move
        this.currentAnim.flip.x = this.flip;
        this.parent();
    },

    // player wants to try to push the content from hex-at-pos (from current hex)
    pushToHex: function(pos) {
        var dir = this.hexboard.calcDir(this.hexat, pos);
        if (dir !== undefined) {
            if (this.hexboard.pushHexDir(pos, dir)) {
                this.moveToHex(pos, undefined, true);
            }
        }
    },
    // select a hex to move this player to
    moveToHex: function(pos,iy, force) {
        var dx,dy,
            brdData,
            mult = 2;
        if (iy !== undefined) {
            pos = {ix:pos, iy:iy};                  // ix,iy
        }

        if (!this.hexdest) {
            this.hexboard.calcHexTop(pos);              // tx,ty
            this.hexboard.calcHexCenter(pos);           // cx,cy
            // Check if valid to move to hex
            brdData = this.hexboard.getBoardDataAt(pos);
            if (!brdData.solid || force) {
                this.hexdest = pos;                         // {ix,iy, tx,ty, cx,cy}
                this.accel.x = 0;
                this.accel.y = 0;
                dx = pos.cx - this.pos.x;
                dy = pos.cy - this.pos.y;
                this.vel.x = dx * mult;
                this.vel.y = dy * mult;
                this.flip = (dx < 0);
                this.currentAnim = this.anims.run;
                this.pubsub.publish("BRD:PlayerLeaving", {hex:this.hexat});
            }
        }
    },

    // player has finished moving, and is now standing in the center of the hex(pos)
    snapToHex: function(pos) {
        this.setPos(pos);                   // place them EXACTLY in the right spot
        this.vel.x = 0;                     // stop them from moving
        this.vel.y = 0;
        this.hexat = pos;                   // save location at
        this.hexdest = undefined;           // clear the "destination hex"
        this.currentAnim = this.anims.idle; // stand still
        this.pubsub.publish("BRD:PlayerStanding", {hex:this.hexat});
    }

});

});
