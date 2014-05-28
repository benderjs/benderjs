App.module( 'Common', function ( Common, App, Backbone ) {
    /**
     * Table view used for displaying collections in bootstrap styled tables
     * @extends {Backbone.Marionette.CompositeView}
     */
    Common.TableView = Backbone.Marionette.CompositeView.extend( {
        className: 'panel panel-default',
        itemViewContainer: 'tbody'
    } );

    /**
     * View for displaying bootstrap styled modal dialogs
     * @extends {Backbone.Marionette.ItemView}
     */
    Common.ModalView = Backbone.Marionette.ItemView.extend( {
        className: 'modal-content',

        onRender: function () {
            this.undelegateEvents();
            this.$el.wrap( '<div class="modal-dialog"></div>' );
            this.$el = this.$el.parent();
            this.setElement( this.$el );
        }
    } );
} );
