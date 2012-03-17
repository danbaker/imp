ig.module( 
	'game.hexboard'
)
.requires(
	'impact.game'
)
.defines(function(){

MyHexBoard = ig.Class.extend({
	
	// Load a font
    ticker: 0,
    a: 0,
    b: 0,
    c: 0,
    font: new ig.Font( 'media/04b03.font.png' ),
    img: new ig.Image('media/hex2.png'),
    img3: new ig.Image('media/hex3.png'),

	
	init: function() {
		// Initialize your game here; bind keys etc.
        this.c = 32;                                                     // 26: 44x52
        this.a = parseInt(this.c * 0.5, 10);
        this.b = parseInt(Math.sin(60/180*Math.PI) * this.c, 10);
        console.log("Width="+(2*this.b)+", Height="+(2*this.c));
        console.log("a="+this.a+"  b="+this.b+"  c="+this.c);
	},
	
	update: function() {

		// Add your own, additional update code here
	},

    // // // // // // // // // // //
    //
    //   General-Purpose Hex-Board
    //
    // {
    //  ix,iy   = index into the board array.  5,3 means 5th hex to the right and 3rd down.
    //  cx,cy   = center-of-hex (pixels).       used to draw player in hex
    //  tx,ty   = top/left-of-hex (pixels).     used to draw entire hex cell
    //  mx,my   = "mouse" pixel location.       any arbitrary screen pixel location
    // }

    // calculate the top/left screen position from a hex-index
    // in: {ix,iy} or (ix,iy) = the numbered-hex.   (5,3) is the fifth hex to the right and 3 down
    // out: {tx:tx,ty:ty} = the screen position of this hex (can be passed to "calcHexCenter")
    calcHexTop: function(pos, iy) {
        if (iy !== undefined) {
            pos = {ix:pos, iy:iy};
        }
        var xAdd = this.b * 2,              // horizontal distance between cells
            yAdd = this.a + this.c;         // vertical distance between cells
        pos.tx = pos.ix * xAdd + (pos.iy%2?this.b:0);
        pos.ty = pos.iy * yAdd;
        return pos;
    },
    // calculate the center of a hex that has screen-coordinates of (x,y)
    // in: {tx,ty} or (tx,ty)
    // out: {} with {cx,cy} injected into it
    calcHexCenter: function(pos, ty) {
        if (ty !== undefined) {
            pos = {tx:pos, ty:ty};
        }
        pos.cx = pos.tx+this.b;
        pos.cy = pos.ty+this.c;
        return pos;
    },


    // try to find a hex, given a mouse/screen position
    // in: (mx,my) = the mouse/screen position
    // out: {ix:ix, iy:iy} = the hex-index OR null
    findHexAt: function(mx, my) {
        var xAdd, yAdd,
            ix, iy,
            x, y,
            pos;

        xAdd = this.b * 2;
        yAdd = this.a + this.c;

        x = parseInt(mx / xAdd, 10);               // possible index
        y = parseInt(my / yAdd, 10);
        for(iy=y-1; iy<y+2; iy++) {
            for(ix=x-1; ix<x+2; ix++) {
                pos = this.calcHexTop(ix,iy);       // hex top/left position
                if (this.isPointInHex(mx,my, pos)) {
                    return pos;                     // screen point (mx,my) IS in hex "pos"
                }
            }
        }
        return null;
    },


    // check if a point is in a hex
    // in:  (mx,my) = mouse/screen point to check
    //      (tx,ty) or {} = hex screen top/left x,y
    // @return true means
    isPointInHex: function(mx,my, tx,ty) {
        if (ty === undefined) {
            ty = tx.ty;
            tx = tx.tx;
        }
        var pos = this.calcHexCenter(tx,ty),
            dx = pos.cx - mx,
            dy = pos.cy - my,
            d = (dx*dx + dy*dy),
            w = (this.b);
        return d < w*w;
    },

    // Note: this gets called every frame
	draw: function() {

		// Add your own drawing code here
		var w = ig.system.width,
			h = ig.system.height,
            mx=ig.input.mouse.x,            // screen x,y of the mouse
            my=ig.input.mouse.y,
            x,y,                            // hex screen x,y (not adjusted for odd rows)
            tx,ty,                          // hex top screen x,y of the hex (adjusted for odd rows)
            mouseHover,
            row = true,
            xAdd = this.b * 2,
            yAdd = this.a + this.c,
            nWide = parseInt(w / xAdd, 10) * xAdd,
            nHigh = parseInt((h-this.a) / yAdd, 10) * yAdd;

        for(y=0; y<nHigh; y+= yAdd) {
            for(x=0; x<nWide; x+= xAdd) {
                // get the top/left corner of this hex
                ty = y;
                tx = x+(row?0:this.b);
                mouseHover = false;
                if (mx >= tx && mx < tx + xAdd) {
                    if (my >= ty && my < ty + yAdd+this.a) {
                        // mouse is *possibly* over this hex
                        if (this.isPointInHex(mx,my, tx,ty)) {
                            mouseHover = true;
                        }
                    }
                }
                if (mouseHover) {
                    this.img3.draw(tx, ty);
                } else {
                    this.img.draw(tx, ty);
                }
            }
            row = !row;
        }
	}
});


});
