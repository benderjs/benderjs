/* bender-tags: foo, bar, baz */
/* bender-ui: collapsed */

if ( global.bender ) {
	bender.test( {
		'test foo': function() {
			bender.assert.areSame( true, true, 'test' );
		}
	} );
}
