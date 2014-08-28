/* bender-tags: foo, bar, baz */
/* bender-testPlugin-flag: foo */

if ( global.bender ) {
	bender.test( {
		'test foo': function() {
			bender.assert.areSame( true, true, 'test' );
		}
	} );
}
