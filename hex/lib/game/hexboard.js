ig.module( 
	'game.hexboard'
)
.requires(
	'impact.game'
)
.defines(function(){

MyHexBoard = ig.Class.extend({
	
    ticker: 0,
    offset: { x:10, y: 10 },        // extra padding in top/left corner
    a: 0,
    b: 0,
    c: 0,
    xAdd: 0,                        // pixels from cell to cell x-direction and y-direction
    yAdd: 0,
    brdWide: 0,                     // board is N cells wide and high
    brdHigh: 0,
    brd: [],                        // brd[x][y] = {} = what is at this cell on the board (lots of data)
    brdImages: [],                  // array of images



	
	init: function() {
		// Initialize your game here; bind keys etc.
        this.c = 32;                                                     // 26: 44x52
        this.a = parseInt(this.c * 0.5, 10);
        this.b = parseInt(Math.sin(60/180*Math.PI) * this.c, 10);
        var w = ig.system.width,
            h = ig.system.height;
        this.xAdd = this.b * 2;
        this.yAdd = this.a + this.c;
        this.brdWide = parseInt(w / this.xAdd, 10) * this.xAdd;
        this.brdHigh = parseInt((h-this.a) / this.yAdd, 10) * this.yAdd;

        this.loadImages();
        this.buildBoard();

        console.log("Hex Width="+(2*this.b)+", Height="+(2*this.c));
        console.log("... a="+this.a+"  b="+this.b+"  c="+this.c);
        console.log("Board size="+this.brdWide+"x"+this.brdHigh);
	},

    loadImages: function() {
        this.font =  new ig.Font( 'media/04b03.font.png' );
        this.imgHover = new ig.Image('media/hexhover.png');

        this.brdImages[0] = new ig.Image('media/hexMtn.png');
        this.brdImages[1] = new ig.Image('media/hex2.png');

    },

    buildBoard: function() {
        var id;
        // create an empty board
        this.brd = [];
        for(var x=0; x<this.brdWide; x++) {
            this.brd[x] = [];
            for(var y=0; y<this.brdHigh; y++) {
                id = ig.game.random() < 0.30? 0 : 1;    // 30% chance of mountain
                this.brd[x][y] = { id: id };
            }
        }
        // force starting location to be "floor"
        this.brd[1][7].id = 1;
    },

	update: function() {
		// Add your own, additional update code here
	},

    // // // // // // // // // // //
    //
    //   Board Content Routines
    //
    //  board-data = {
    //      id: 1               // index into this.brdImages[]
    //  }

    // get the board-data object at a given index
    // in: {} or (ix,iy) = location to get board-data from
    // out: {} = board-data object (NEVER null)
    getBoardDataAt: function(pos, iy) {
        if (iy !== undefined) {
            pos = {ix:pos, iy:iy};
        }
        if (pos.ix >= 0 && pos.ix < this.brdWide && pos.iy >= 0 && pos.iy < this.brdHigh) {
            return this.brd[pos.ix][pos.iy];
        }
        // requested something that is OFF the board ... return a known object
        return { id: 0 };
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
        pos.tx = pos.ix * xAdd + (pos.iy%2?this.b:0) + this.offset.x;
        pos.ty = pos.iy * yAdd + this.offset.y;
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

    // check if two hex are touching
    // in:  pos1 = {}
    //      pos2 = {}
    // out: n = distance between (1 means next to each other)
    // hex layout:          (0,0)  (1,0)  (2,0)  (3,0) ...
    //                          (0,1)  (1,1)  (2,1)  (3,1) ...
    //                      (0,2)  (1,2)  (2,2)  (3,2) ...
    isNext: function(pos1, pos2) {
        var dir,
            pos;
        for(dir=1; dir<=6; dir++) {
            pos = { ix:pos1.ix, iy:pos1.iy };
            this.moveDir(pos, dir);
            if (pos.ix === pos2.ix && pos.iy === pos2.iy) {
                return true;        // got to pos2 from pos1 in 1 move
            }
        }
        return false;
    },

    // move a position in a direction
    // direction:           2   3
    //                    1   x   4
    //                      6   5
    moveDir: function(pos, dir) {
        var odd = pos.iy % 2;           // false means top(fist) row
        switch (dir) {
            case 1: pos.ix--; break;
            case 2: pos.iy--; if (!odd) pos.ix--;   break;
            case 3: pos.iy--; if (odd) pos.ix++;    break;
            case 4: pos.ix++; break;
            case 5: pos.iy++; if (odd) pos.ix++;    break;
            case 6: pos.iy++; if (!odd) pos.ix--;   break;
        }
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

        x = parseInt(mx / this.xAdd, 10);               // possible index
        y = parseInt(my / this.yAdd, 10);
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
		var mx=ig.input.mouse.x,            // screen x,y of the mouse
            my=ig.input.mouse.y,
            x,y,                            // hex screen x,y (not adjusted for odd rows)
            ix,iy,
            tx,ty,                          // hex top screen x,y of the hex (adjusted for odd rows)
            mouseHover,
            row = true,
            brdData;                        // board-data object

        for(iy=0, y=this.offset.y; y<this.brdHigh; y+= this.yAdd, iy++) {
            for(ix=0, x=this.offset.y; x<this.brdWide; x+= this.xAdd, ix++) {
                brdData = this.getBoardDataAt(ix,iy);
                // get the top/left corner of this hex
                ty = y;
                tx = x+(row?0:this.b);
                mouseHover = false;
                if (mx >= tx && mx < tx + this.xAdd) {
                    if (my >= ty && my < ty + this.yAdd+this.a) {
                        // mouse is *possibly* over this hex
                        if (this.isPointInHex(mx,my, tx,ty)) {
                            mouseHover = true;
                        }
                    }
                }
                this.brdImages[brdData.id].draw(tx,ty);
                if (mouseHover) {
                    this.imgHover.draw(tx, ty);
                }
            }
            row = !row;
        }
	}
});


});
