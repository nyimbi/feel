var React = require("react");
var ReactDOM = require("react-dom");
var _ = require("underscore");

var md = require("md");


var MarkdownAndPreviewAttrs = {
    
    getInitialState: function() {
        return {
            input: "",
            display: ""        
        }
    },

    componentDidMount: function() {
        if(this.props.shouldFocus) {
            this.focus();
        }
    },

    render: function() {
        var display = this.state.display;

        var displayClassName = "";
        if(display) {
            displayClassName = "md-preview-with-content";
        }

        var className = "row";
        if(this.props.htmlClass) {
            className += " " + this.props.htmlClass
        }

        return (
            
                <div className={className}>
                    <div className="col xs-12 col-md-6">
                        <h6 className="md-and-html-heading">
                            Markdown Input
                        </h6>

                        <textarea className="md-and-html-input"
                                  placeholder={this.props.placeholder} 
                                  ref="textarea" 
                                  onKeyUp={this.updateContent} 
                                  onChange={this.updateContent} 
                                  value={this.state.input} 

                        />
                    </div>

                    <div className="col-xs-12 col-md-6">
                        <h6 className="md-and-html-heading">
                            HTML Preview
                        </h6>
                        <div className={displayClassName} 
                              dangerouslySetInnerHTML={{__html: display}} 
                        />

                    </div>

                </div>

        );
    },

    updateContent: function(evt) {
        var input = evt.target.value;
        var display = md.mdAndMathToHtml(input);
        
        var state = {
            input: input,
            display: display
        };

        this.setState(state);

        if(this.onContentUpdated && _.isFunction(this.onContentUpdated)) {
            this.onContentUpdated(state);
        }

    }

}

module.exports = {
    MarkdownAndPreviewAttrs: MarkdownAndPreviewAttrs
};

