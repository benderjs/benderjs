(function (Ember, App, DS, Bootstrap) {

    // Bootstrap for Ember - Notification Manager modification
    Bootstrap.NM = Bootstrap.NotificationManager = Ember.Object.create({
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

    Bootstrap.NotificationView = Ember.View.extend({
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

    Bootstrap.NotificationsView = Ember.CollectionView.extend({
        classNames: ['notifications'],
        attributeBindings: ['style'],
        contentBinding: 'Bootstrap.NM.content',
        itemViewClass: Bootstrap.NotificationView,
        
        showTime: 2000,
        fadeInTime: 500,
        fadeOutTime: 500,
        showTimeout: null,
        
        contentChanged: function () {
            if (this.get('content').length) this.resetShowTime();
        }.observes('content.length'),
        
        resetShowTime: function () {
            this.$().css('display', 'block');
            
            if (this.$().is(':animated')) {
                this.$().stop().animate({
                    opacity: '100'
                });
            }
            
            if (this.showTimeout) clearTimeout(this.showTimeout);

            this.showTimeout = setTimeout(this.fadeOut, this.showTime, this);
        },
        
        fadeOut: function(that) {
            return that.$().fadeOut(that.fadeOutTime, function () {
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

    Ember.Handlebars.helper('bs-notifications', Bootstrap.NotificationsView);

    
    Bootstrap.LabelView = Ember.View.extend({
        classNames: ['label'],
        classNameBindings: ['labelType'],
        tagName: 'span',
        template: Ember.Handlebars.compile('{{view.text}}'),

        labelType: function () {
            return 'label-' + this.get('type');
        }.property('type')
    });

    Ember.Handlebars.helper('bs-label', Bootstrap.LabelView);

    
    Bootstrap.MomentView = Ember.View.extend({
        template: Ember.Handlebars.compile('{{view.converted}}'),
        classNames: ['moment'],
        tagName: 'span',

        converted: function () {
            return moment(this.get('time')).fromNow();
        }.property('time')
    });

    Ember.Handlebars.helper('bs-moment', Bootstrap.MomentView);

    
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

})(Ember, App, DS, Bootstrap);
