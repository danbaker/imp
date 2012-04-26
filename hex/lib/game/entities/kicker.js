ig.module(
	'game.entities.kicker'
)
.requires(
	'game.entities.player'
)
.defines(function(){

EntityKicker = EntityPlayer.extend({

	init: function( x, y, settings ) {
        settings.notPlayer = true;
		this.parent( x, y, settings );
        // @TODO: set the animSheet, based on passed in data
        this.animSheet = new ig.AnimationSheet( 'media/hexKick.png', 56,65);
        this.addAnim( 'idle', 1, [0] );
	},


    update: function() {
        this.currentAnim.flip.x = this.flip;
        this.parent();
    },



    zLastFunction: function() {

    }
});

});
