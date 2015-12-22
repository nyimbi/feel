var React = require("react");
var ReactDOM = require("react-dom");

var $ = require("jquery");
var _ = require("underscore");
var Backbone = require("backbone");

var utils = require("utils");
var StreamSaveModel = require("models").StreamSaveModel;
var mdAndMathToHtml = require("md").mdAndMathToHtml;

var MarkdownAndPreviewMixin = require("markdown-and-preview.jsx").MarkdownAndPreviewAttrs;
var ListMixin = require("list-mixin.jsx").ListMixin;
var CodeView = require("code-view").CodeView;
var CodeQuizModel = StreamSaveModel.extend({

    defaults: {
        problemStatement: "",
        bootstrapCode: "",
        timeLimit: 5000,
        memoryLimit: 262144,
        testCases: []
    },

    BASE_URL: "/api/v1/codequizzes/",

    url: function() {
        if(this.isNew()) {
            return this.BASE_URL;
        }
        return "{0}{1}/".format(this.BASE_URL, this.attributes.id);
    }
});

var Store = function(options) {
    this.options = options;
    this._model = new CodeQuizModel({
        id: options.id
    });

    if(options.id === null && options.updateURL) {
        this._model.once("sync", this.updateURL, this)
    }
};

Store.prototype = {

    getProblemStatement: function() {
        return _.clone(this._model.attributes.problemStatement);
    },

    setProblemStatement: function(problemStatement) {
        this._model.attributes.problemStatement = problemStatement;
        this._model.save();
    },

    getBootstrapCode: function() {
        return _.clone(this._model.attributes.bootstrapCode);
    },

    setBootstrapCode: function(bootstrapCode) {
        this._model.attributes.bootstrapCode = bootstrapCode;
        this._model.save();
    },

    getTestCaseAt: function(index) {
        return _.clone(this._model.attributes.testCases[index]);
    },

    updateTestCaseAt: function(attrs, index) {
        var testCase = this._model.attributes.testCases[index];
        _.each(attrs, function(value, key) {
            testCase[key] = value;
        });
        this._model.save();
    },

    addTestCase: function() {
        var testCase = {
            input: "",
            output: ""
        };
        this._model.attributes.testCases.push(testCase);
    },

    cleanup: function() {
        this.off();
        this._model.off();
    },

    fetch: function() {
        if(this._model.isNew()) {
            return new $.Deferred().resolve();
        }
        var self = this;
        return this._model.fetch();
    },

    updateURL: function() {
        var fragment = Backbone.history.getFragment();
        fragment = utils.addTrailingSlash(fragment);
        var url = "{0}{1}/".format(fragment, this._model.attributes.id);
        Backbone.history.navigate(url, {trigger: false});
    },

    toJSON: function() {
        return this._model.toJSON();
    }
};
_.extend(Store.prototype, Backbone.Events);
Store.prototype.constructor = Store;

var SingleTestCase = React.createClass({

    getInitialState: function() {
        return this.props.store.getTestCaseAt(this.props.index);
    },

    render: function() {

        return (
            <div className="row">
                <div className="col-md-6">
                    <h6 className="center">Input</h6>

                    <textarea   className="testcase-creator-io"
                                value={this.state.input}
                                onKeyUp={this.updateInput} 
                                onChange={this.updateInput} />
                </div>

                <div className="col-md-6">
                    <h6 className="center">Expected Output</h6>

                    <textarea   className="testcase-creator-io" 
                                value={this.state.output}
                                onKeyUp={this.updateOutput} 
                                onChange={this.updateOutput} />
                </div>
            </div>
        );
    },

    updateInput: function(evt) {
        this.updateState({
            input: evt.target.value
        });
    },

    updateOutput: function(evt) {
        this.updateState({
            output: evt.target.value
        });
    },

    updateState: function(attrs) {
        this.setState(attrs);
        this.props.store.updateTestCaseAt(attrs, this.props.index);
    }
});

var TestCaseList = React.createClass({

    mixins: [ListMixin],

    getInitialState: function() {
        return this.props.store.toJSON()
    },

    _buildProps: function(testCase, i) {
        return {
            index: i,
            store: this.props.store
        };
    },

    render: function() {

        var list = this.createList({
            ComponentClass: SingleTestCase,
            collection: this.state.testCases,
            buildProps: this._buildProps
        });
        return (
            <div>
                <h5>Test Cases </h5>
                {list}
                <button className="btn waves-effect" 
                        onClick={this.addTestCase}>
                        Add Test Case 
                </button>
            </div>
        );
    },

    addTestCase: function() {
        this.props.store.addTestCase();
        this.setState(this.getInitialState());
    }
});

ProblemStatementAttrs = utils.inherit({
    
    getInitialState: function() {

        var input = this.props.store.getProblemStatement();
        var display = mdAndMathToHtml(input);

        return {
            input: input,
            display: display
        };
    },
}, MarkdownAndPreviewMixin);

var ProblemStatement = React.createClass({
    
    mixins: [ProblemStatementAttrs],

    onContentUpdated: function(attrs) {
        this.props.store.setProblemStatement(attrs.input);
    }

});

var PageComponent = React.createClass({

    componentWillMount: function() {
        //this.props.store.on("change", this.updateState, this);
    },

    componentWillUnmount: function() {
        //this.props.store.off("change", this.updateState);
        this.bootstrapCodeView.remove();
    },

    updateState: function() {
        return this.getInitialState();
    },

    render: function() {
        return (
            <div>
                <h5> Problem Statement </h5>
                <ProblemStatement store={this.props.store} />  
                <h5> Bootstrap Code </h5>
                <div id="bootstrap-code"> </div>
                <TestCaseList store={this.props.store} />
            </div>
        );
    },

    componentDidMount: function() {
        var bootstrapCodeView = new CodeView({
            code: this.props.store.getBootstrapCode(),
            listenToInputChange: true
        });
        $("#bootstrap-code").append(bootstrapCodeView.$el);
        bootstrapCodeView.render();
        bootstrapCodeView.on("change", this.updateBootstrapCode, this);
        this.bootstrapCodeView = bootstrapCodeView;

    },

    updateBootstrapCode: function(value) {
        this.props.store.setBootstrapCode(value);
    }
});


var app = {

};

var render = function(options, element) {

    options.updateURL = true;
    var store = new Store(options);
    store.fetch().then(function() {
        ReactDOM.render(<PageComponent store={store} />, element);
    });
    app.store = store;
    app.element = element;

};

var unmount = function() {
    app.store.cleanup();
    ReactDOM.unmountComponentAtNode(app.element);
};

module.exports = {
    render: render,
    unmount: unmount
}