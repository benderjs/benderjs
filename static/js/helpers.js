(function (Ember, App, DS) {

    // Bootstrap for Ember - Notification Manager modification
    App.NM = App.NotificationManager = Ember.Object.create({
        content: Ember.A(),

        push: function(message, type) {
            return this.get('content')
                .pushObject(
                    Ember.Object.create({
                        message: message,
                        type: type || 'info'
                    })
                );
        }
    });

    App.NotificationView = Ember.View.extend({
        classNames: ['alert', 'notification'],
        template: Ember.Handlebars.compile('{{{view.content.message}}}'),
        classNameBindings: ['alertType'],
        isVisible: false,

        alertType: function () {
            var type = this.get('content').get('type');

            return type ? 'alert-' + type : null;
        }.property('content'),
        
        didInsertElement: function () {
            this.$().fadeIn(this.get('fadeInTime'));
        },

        click: function () {
            this.$().hide();
        }
    });

    App.NotificationsView = Ember.CollectionView.extend({
        classNames: ['notifications'],
        attributeBindings: ['style'],
        contentBinding: 'App.NM.content',
        itemViewClass: App.NotificationView,
        
        showTime: 2000,
        fadeInTime: 500,
        fadeOutTime: 500,
        showTimeout: null,
        
        contentChanged: function () {
            if (this.get('content').length) this.resetShowTime();
        }.observes('content.length'),
        
        resetShowTime: function () {
            var that = this;

            this.$().css('display', 'block');
            
            if (this.$().is(':animated')) {
                this.$().stop().animate({
                    opacity: '100'
                });
            }
            
            if (this.showTimeout) clearTimeout(this.showTimeout);

            this.showTimeout = setTimeout(function () {
                that.fadeOut.call(that);
            }, this.showTime, this);
        },
        
        fadeOut: function() {
            var that = this;

            return this.$().fadeOut(this.fadeOutTime, function () {
                return that.get('content').clear();
            });
        },
        
        mouseEnter: function () {
            if (this.$().is(':animated')) {
                this.$().stop().animate({
                    opacity: '100'
                });
            }

            if (this.showTimeout) clearTimeout(this.showTimeout);
        },

        mouseLeave: function () {
          this.resetShowTime();
        }
    });

    Ember.Handlebars.helper('notifications', App.NotificationsView);

    
    App.LabelView = Ember.View.extend({
        classNames: ['label'],
        classNameBindings: ['labelType'],
        tagName: 'span',
        template: Ember.Handlebars.compile('{{view.text}}'),

        labelType: function () {
            return 'label-' + this.get('type');
        }.property('type')
    });

    Ember.Handlebars.helper('label', App.LabelView);

    
    App.MomentView = Ember.View.extend({
        template: Ember.Handlebars.compile('{{view.converted}}'),
        classNames: ['moment'],
        tagName: 'span',

        converted: function () {
            return moment(this.get('time')).fromNow();
        }.property('time')
    });

    Ember.Handlebars.helper('moment', App.MomentView);
    
    // enable data-toggle attribute for inputs
    Ember.TextField.reopen({
        attributeBindings: ['data-toggle']
    });


    App.RawTransform = DS.Transform.extend({
        serialize: function (data) {
            return data;
        },
        deserialize: function (data) {
            return data;
        }
    });

})(Ember, App, DS);
