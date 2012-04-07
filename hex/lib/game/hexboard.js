ig.module( 
	'game.hexboard'
)
.requires(
	'impact.game',
    'game.utanim',
    'game.utpubsub',
    'game.hexcell'
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
    brdPixelWide: 0,                // board size in pixels
    brdPixelHigh: 0,
    brd: [],                        // brd[x][y] = {} = what is at this cell on the board (lots of data)
//    brdType: {},                    // enumerations of the available types (.EDGE = 0)
//    brdData: [],                    // brdData[0] = the default board-data for a "0" (Mountain/Edge)
//    brdImages: [],                  // array of images
    hexcell: null,                  // THE set of possible hex cells and their code
    pubsub: UT.PubSub.getInstance(),
    uiShowing: false,               // true means: UserInterface is showing on top of the hexboard, ignore mouse for now


	
	init: function() {
		// Initialize your game here; bind keys etc.
        this.c = 32;                                                     // 26: 44x52
        this.a = parseInt(this.c * 0.5, 10);
        this.b = parseInt(Math.sin(60/180*Math.PI) * this.c, 10);
        var w = ig.system.width,
            h = ig.system.height;
        this.xAdd = this.b * 2;
        this.yAdd = this.a + this.c;
        this.brdWide = parseInt(w / this.xAdd, 10);
        this.brdHigh = parseInt((h-this.a) / this.yAdd, 10);
        this.brdPixelWide = this.brdWide * this.xAdd;
        this.brdPixelHigh = this.brdHigh * this.yAdd;

        this.hexcell = new HexCell(this);
        this.loadImages();
        this.buildBoard();

        console.log("Hex Width="+(2*this.b)+", Height="+(2*this.c));
        console.log("... a="+this.a+"  b="+this.b+"  c="+this.c);
        console.log("Board size="+this.brdWide+"x"+this.brdHigh);
	},

    loadImages: function() {
        this.font =  new ig.Font( 'media/04b03.font.png' );
        this.imgHover = new ig.Image('media/hexhover.png');

//        this.brdImages[this.hexcell.brdType.MOUNTAIN] = new ig.Image('media/hexMtn.png');
//        this.brdImages[this.hexcell.brdType.FLOOR] = new ig.Image('media/hex2.png');

    },

    // build/create one hex on the board
    buildOneHex: function(idx, x,y, settings) {
        var brdData = ig.copy(this.hexcell.brdData[idx]);
        if (settings) {
            for(var key in settings) {
                if (settings.hasOwnProperty(key)) {
                    brdData[key] = settings[key];
                }
            }
        }
        if (brdData.build) {
            brdData.build();
        }
        if (x !== undefined && y !== undefined) {
            this.brd[x][y] = brdData;
            if (brdData.anim1) {
                brdData.anim1.setPos(x,y);
            }
            if (brdData.anim2) {
                brdData.anim2.setPos(x,y);
            }
        }
        brdData.uid = {ix:x,iy:y,note:"DEBUG-ONLY"};    // This is a debug object that identifies this hex cell, based on where it started
        if (!brdData.rotate) brdData.rotate = 0;        // default to normal-rotation (facing right)
        // brdData.
        //  anim        = {} current animation running
        //  anim1,2,... = {} animation objects (utanim)
        //  bases       = [] [0] = lowest base, [1] = next base on top of base[0] ... like ROTATE, MOVE
        //  down        = true means a switch is in the "down" position (false means it is up)
        //  rotate      = direction piece is rotated (0=to the right, 1=right/up ... around like degrees)
        //  solid       = true means player can NOT walk on
        //  type        = MOUNTAIN,SWITCH ...
        //  uid         = {} debug info about where this cell was created
        return brdData;
    },

    // build/create the entire board
    buildBoard: function() {
        var id,
            t = this.hexcell.brdType;

        // create an empty board
        this.brd = [];
        for(var x=0; x<this.brdWide; x++) {
            this.brd[x] = [];
            for(var y=0; y<this.brdHigh; y++) {
                id = ig.game.random() < 0.30? t.MOUNTAIN : t.FLOOR;    // 30% chance of mountain
                this.brd[x][y] = this.buildOneHex(id, x,y);
            }
        }
        // create the starting location
        // DEBUG BOARD FILL-IN:
        this.brd[1][7] = this.buildOneHex(t.START, 1,7);
        this.brd[2][7] = this.buildOneHex(t.SWITCH, 2,7, {down:false});
        this.brd[2][6] = this.buildOneHex(t.SWITCH, 2,6, {down:false});
        this.brd[1][5] = this.buildOneHex(t.SWITCH, 1,5, {down:true});
        this.brd[3][6] = this.buildOneHex(t.WALL, 3,6, {down:false, solid:true, bases:[t.MOVE]});
        this.brd[4][8] = this.buildOneHex(t.WALL, 4,8, {down:false, solid:true, rotate:2, bases:[t.ROTATE]});
        this.brd[5][7] = this.buildOneHex(t.PLATE, 5,7, {down:false, operate:[{ix:4,iy:8}]});

        // DEBUG SEQUENCES FOR THIS DEBUG BOARD:
        this.seq = [];
        var seq = {};       // 1 sequence:
        seq.need = [];
            var need = {down:true, cells:[{ix:2,iy:7},{ix:2,iy:6}]};        // 2 switches DOWN
            seq.need.push(need);
            need = {down:false, cells:[{ix:1,iy:5}]};                       // 1 switch UP
            seq.need.push(need);
        seq.event = "down";                                           // push wall DOWN when ALL switches are correct
        seq.operate = [{ix:3,iy:6}];                                        // walls to operate when ALL switch are correct
        this.seq.push(seq);
        seq = {};           // 1 sequence
        seq.need = [];
            need = {down:false, cells:[{ix:2,iy:7}]};                       // 1 switch UP
            seq.need.push(need);
        seq.event = "up";                                             // push wall UP if this one switch is up
        seq.operate = [{ix:3,iy:6}];                                        // walls to operate when ALL switch are correct
        this.seq.push(seq);
        seq = {};           // 1 sequence
        seq.need = [];
            need = {down:false, cells:[{ix:2,iy:6}]};                       // 1 switch UP
            seq.need.push(need);
        seq.event = "up";                                             // push wall UP if this one switch is up
        seq.operate = [{ix:3,iy:6}];                                        // walls to operate when ALL switch are correct
        this.seq.push(seq);
        seq = {};           // 1 sequence
        seq.need = [];
            need = {down:true, cells:[{ix:1,iy:5}]};                        // 1 switch DOWN
            seq.need.push(need);
        seq.event = "up";                                             // push wall UP if this one switch is down
        seq.operate = [{ix:3,iy:6}];                                        // walls to operate when ALL switch are correct
        this.seq.push(seq);
        this._fixupBoardReferences();
    },

    _fixupBoardReferences: function() {
        // fixup all board cell references (from positions to actual pointers to the brdData)
        for(var x=0; x<this.brdWide; x++) {
            for(var y=0; y<this.brdHigh; y++) {
                var bd = this.getBoardDataAt(x,y);
                this._fixupReferencesArray(bd.operate);         // fixup "operate" array of references
            }
        }
        // fixup all sequence cell references too
        for(var idx=0; idx<this.seq.length; idx++) {
            var seq = this.seq[idx];
            this._fixupReferencesArray(seq.operate);            // fixup "operate" array of references
            if (seq.need) {
                for(var i=0; i<seq.need.length; i++) {
                    var need = seq.need[i];
                    this._fixupReferencesArray(need.cells);     // fixup "cells" array of references
                }
            }
        }
    },
    _fixupReferencesArray: function(ary) {
        if (ary) {
            for(var idx=0; idx<ary.length; idx++) {
                var item = ary[idx];
                if (item.type === undefined) {
                    // This item in the array appears to be a "position" not a "reference to an actual board hex cell"
                    var bd = this.getBoardDataAt(item);
                    if (bd !== this.hexcell.brdData[0]) {
                        // replace the position w/ an actual ptr/reference to the board-cell
                        ary[idx] = bd;
                    }
                }
            }
        }
    },

    // check all sequences .. to see if one of them NOW is true (because the board just changed)
    // in: brdData = the hex-cell board-data that just changed
    checkSequences: function(brdData) {
        // walk all sequences, looking for any that include this brdData ... if they are true, then trigger event
        for(var idx=0; idx<this.seq.length; idx++) {
            var seq = this.seq[idx];
            var seqTriggered = true;        // ALL needs met.
            var brdDataFound = false;       // "brdData" was part of this sequence needs
            if (seq.need) {
                for(var i=0; seqTriggered && i<seq.need.length; i++) {
                    var need = seq.need[i];
                    // need = {down:true, cells:[{ix:2,iy:7},{ix:2,iy:6}]};        // 2 switches DOWN
                    if (need.cells) {
                        for(var ic=0; seqTriggered && ic<need.cells.length; ic++) {
                            var bd = need.cells[ic];
                            if (bd.down !== need.down) {
                                seqTriggered = false;                               // need was NOT met
                            }
                            if (bd === brdData) {
                                brdDataFound = true;                                // brdData WAS part of this sequence needs (CAN trigger)
                            }
                        }
                    }
                }
                if (seqTriggered && brdDataFound) {
                    // sequence was triggered (all needs are currently met) AND brdData was included in those needs to be met
                    // TODO: trigger event!
                    // TODO: walk the entire "operate" list ... and fire event on each brdData
                    console.log("SEQUENCE JUST TRIGGERED");
                    if (seq.operate) {
                        for(i=0; i<seq.operate.length; i++) {
                            bd = seq.operate[i];
                            var fnc = "doOperate_"+seq.event;           // doOperate_up
                            if (bd[fnc]) {
                                bd[fnc]({seq:seq});
                            }
                        }
                    }
                }
            }
        }

    },

	update: function() {
		// Add your own, additional update code here
        // TODO: animate board items (like switches and water)
        var x,y, brdData;
        for(x=0; x<this.brdWide; x++) {
            for(y=0; y<this.brdHigh; y++) {
                brdData = this.brd[x][y];
                if (brdData.anim) {
                    brdData.anim.update();
                }
            }
        }
	},

    // // // // // // // // // // //
    //
    //   Board Content Routines
    //
    //  board-data = {
    //      type: FLOOR             // the actual "type" of cell (index into this.brdData[])
    //      id: 1                   // the main image to draw (index into this.brdImages[])
    //      solid: true             // true means player can NOT walk on it
    //      anim: new ig.Animation  // an animation object
    //
    //      down:true               // state of a floor switch (true means depressed, false means up)
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
        // requested something that is OFF the board ... return a known "Edge" object
        return this.hexcell.brdData[0];
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
//        if (true) {
//            // DEBUG CODE
//            this.tick = false;
//            if (!this.frameN) this.frameN = 0;
//            this.frameN++;
//            if (this.frameN % 30 === 0) {
//                this.tick = true;
//            }
//        }

		// Add your own drawing code here
		var mx=ig.input.mouse.x,            // screen x,y of the mouse
            my=ig.input.mouse.y,
            x,y,                            // hex screen x,y (not adjusted for odd rows)
            ix,iy,
            tx,ty,                          // hex top screen x,y of the hex (adjusted for odd rows)
            mouseHover,
            row = true,
            bi,                             // base-index (index into the .base array)
            brdData,                        // board-data object
            img;

        if (this.uiShowing) {
            mx = my = -12345;
        }

        for(iy=0, y=this.offset.y; y<this.brdPixelHigh; y+= this.yAdd, iy++) {
            for(ix=0, x=this.offset.x; x<this.brdPixelWide; x+= this.xAdd, ix++) {
                brdData = this.getBoardDataAt(ix,iy);
//                if (this.tick && brdData.rotate) {
//                    brdData.rotate++;
//                    if (brdData.rotate > 5) brdData.rotate = 1;
//                }
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
                // 1) draw the main board-image for this cell
                img = this.hexcell.brdImages[brdData.id];
                if (img) img.draw(tx,ty);
                // 2) draw all "bases"
                if (brdData.bases) {
                    for(bi=0; bi<brdData.bases.length; bi++) {
                        img = this.hexcell.brdImages[brdData.bases[bi]];
                        if (img) img.draw(tx,ty);
                    }
                }
                // 3) draw animated object
                if (brdData.anim) {
                    brdData.anim.angle = Math.PI*2/6 * brdData.rotate;
                    brdData.anim.draw(tx,ty);
                }
                // 4) draw the "hover" image last
                if (mouseHover) {
                    this.imgHover.draw(tx, ty);
                }
            }
            row = !row;
        }
	},

    log:function(msg) {
        console.log(msg);
    }

});


});
