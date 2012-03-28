ig.module(
	'game.utanim'
)
.requires(
	'impact.animation',
    'game.utpubsub'
)
.defines(function(){

UT.Anim = ig.Animation.extend({

    doneEventFired: false,              // true means we have already fired the event when the animation finished
    eventName: null,                    // "ANIM.switchDown"  event to fire when animation finished/completes/is-done
    pos: undefined,                     // {ix:1,iy:2}  board position of this animation
    pubsub: UT.PubSub.getInstance(),

	init: function(sheet, frameTime, sequence, stop, evtName ) {
		this.parent(sheet, frameTime, sequence, stop);
        if (evtName) {
            this.eventName = "ANIM:"+evtName;
        }
	},

    setPos: function(ix,iy) {
        this.pos = {ix:ix, iy:iy};
    },

    update: function() {
        this.parent();

        // check if this animation just finished
        if (!this.doneEventFired && this.frame >= this.sequence.length-1) {
            // TODO: FIRE EVENT "animation complete"
            this.doneEventFired = true;
            if (this.eventName) {
                // publish "Animation Completed in hex(pos)"
                var data = { done:true };
                if (this.pos) data.hex = this.pos;
                this.pubsub.publish(this.eventName, data);
            }
        }
    },

    start: function() {
        if (this.eventName) {
            // publish "Animation Started in hex(pos)"
            var data = { start:true };
            if (this.pos) data.hex = this.pos;
            this.pubsub.publish(this.eventName, data);
        }
    },

    rewind: function() {
        this.doneEventFired = false;
        this.parent();
    }

});

});