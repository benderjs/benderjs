/* bender-tags: foo, foo, foo, bar, baz, fixtures */

if ( global.bender ) {
	bender.test( {
		'test foo': function() {
			bender.assert.areSame( true, true, 'test' );
		}
	} );
}
