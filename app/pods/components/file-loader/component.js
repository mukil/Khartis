import Ember from 'ember';

export default Ember.Component.extend({
    
    label: "Choisir un fichier",
    
    fileReaderComponent: null,
    
    click() {
      this.get('fileReaderComponent').send('trigger');
    },
    
    actions: {
        
        onFileReaderReady: function(c) {
            this.set('fileReaderComponent', c);
        },
        
        onread: function(text) {
            this.sendAction('onContentLoaded', text);
        }
        
    }
});
