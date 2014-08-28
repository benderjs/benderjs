/* bender-tags: foo, bar, baz */
/* bender-ui: collapsed */
/* bender-include: http://foo.com/bar/baz.js */

if ( global.bender ) {
	bender.test( {
		'test foo': function() {
			bender.assert.areSame( true, true, 'test' );
		}
	} );
}
