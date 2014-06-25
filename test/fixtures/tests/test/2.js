/* bender-tags: foo, bar, baz */

if ( !global.bender ) {
	return;
}

bender.test( {
	'test foo': function() {
		bender.assert.areSame( true, true, 'test' );
	}
} );
