ig.module(
	'game.utanim'
)
.requires(
	'impact.animation'
)
.defines(function(){

UtAnim = ig.Animation.extend({

    doneEventFired: false,          // true means we have already fired the event when the animation finished

	init: function(sheet, frameTime, sequence, stop  ) {
		this.parent(sheet, frameTime, sequence, stop);
	},

    update: function() {
        this.parent();

        // check if this animation just finished
        if (!this.doneEventFired && this.frame >= this.sequence.length-1) {
            // TODO: FIRE EVENT "animation complete"
            this.doneEventFired = true;
            console.log("ANIMATION FINISHED");
        }
    },

    rewind: function() {
        this.doneEventFired = false;
        this.parent();
    }

});

});