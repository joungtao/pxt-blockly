/**
 * @license
 * Copyright 2012 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Logic blocks for Blockly.
 *
 * This file is scraped to extract a .json file of block definitions. The array
 * passed to defineBlocksWithJsonArray(..) must be strict JSON: double quotes
 * only, no outside references, no functions, no trailing commas, etc. The one
 * exception is end-of-line comments, which the scraper will remove.
 * @author q.neutron@gmail.com (Quynh Neutron)
 */
'use strict';

goog.provide('Blockly.Blocks.logic');  // Deprecated
goog.provide('Blockly.Constants.Logic');

goog.require('Blockly');
goog.require('Blockly.Blocks');
goog.require('Blockly.FieldDropdown');
goog.require('Blockly.FieldLabel');
goog.require('Blockly.Mutator');


goog.require('Blockly.PXTBlockly.Extensions');

/**
 * Unused constant for the common HSV hue for all blocks in this category.
 * @deprecated Use Blockly.Msg['LOGIC_HUE']. (2018 April 5)
 */
Blockly.Constants.Logic.HUE = 210;

Blockly.Blocks['controls_if'] = {
  /**
   * Block for if/elseif/else condition.
   * @this Blockly.Block
   */
  init: function() {
    Blockly.Extensions.apply('inline-svgs', this, false);
    this.elseifCount_ = 0;
    this.elseCount_ = 0;
    this.setHelpUrl(Blockly.Msg['CONTROLS_IF_HELPURL']);
    this.appendValueInput('IF0')
        .setCheck('Boolean')
        .appendField(Blockly.Msg['CONTROLS_IF_MSG_IF']);
    this.appendDummyInput('THEN0')
        .appendField(Blockly.Msg['CONTROLS_IF_MSG_THEN']);
    this.appendStatementInput('DO0');
    this.setOutputShape(Blockly.OUTPUT_SHAPE_HEXAGONAL);
    this.updateShape_();
    this.setInputsInline(true);
    this.setColour(Blockly.Msg['LOGIC_HUE']);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    Blockly.Constants.Logic.CONTROLS_IF_TOOLTIP_EXTENSION.call(this);
  },
  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return null;
    }
    var container = Blockly.utils.xml.createElement('mutation');
    if (this.elseifCount_) {
      container.setAttribute('elseif', this.elseifCount_);
    }
    if (this.elseCount_) {
      container.setAttribute('else', 1);
    }
    return container;
  },
  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    if (!xmlElement) return;
    this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif'), 10) || 0;
    this.elseCount_ = parseInt(xmlElement.getAttribute('else'), 10) || 0;
    this.rebuildShape_();
  },
  /**
   * Store pointers to any connected child blocks.
   */
  storeConnections_: function(arg) {
    if (!arg) arg = 0;
    this.valueConnections_ = [null];
    this.statementConnections_ = [null];
    this.elseStatementConnection_ = null;
    for (var i = 1; i <= this.elseifCount_; i++) {
      if (arg != i) {
        this.valueConnections_.push(this.getInput('IF' + i).connection.targetConnection);
        this.statementConnections_.push(this.getInput('DO' + i).connection.targetConnection);
      }
    }
    if (this.getInput('ELSE')) this.elseStatementConnection_ = this.getInput('ELSE').connection.targetConnection;
  },
  /**
   * Restore pointers to any connected child blocks.
   */
  restoreConnections_: function() {
    for (var i = 1; i <= this.elseifCount_; i++) {
      Blockly.Mutator.reconnect(this.valueConnections_[i], this, 'IF' + i);
      Blockly.Mutator.reconnect(this.statementConnections_[i], this, 'DO' + i);
    }
    if (this.getInput('ELSE')) Blockly.Mutator.reconnect(this.elseStatementConnection_, this, 'ELSE');
  },
  addElse_: function() {
    this.storeConnections_();
    var update = function() {
      this.elseCount_++;
    };
    this.update_(update);
    this.restoreConnections_();
  },
  removeElse_: function() {
    this.storeConnections_();
    var update = function() {
      this.elseCount_--;
    };
    this.update_(update);
    this.restoreConnections_();
  },
  addElseIf_: function() {
    this.storeConnections_();
    var update = function() {
      this.elseifCount_++;
    };
    this.update_(update);
    this.restoreConnections_();
  },
  removeElseIf_: function(arg) {
    this.storeConnections_(arg);
    var update = function() {
      this.elseifCount_--;
    };
    this.update_(update);
    this.restoreConnections_();
  },
  update_: function(update) {
    Blockly.Events.setGroup(true);
    var block = this;
    var oldMutationDom = block.mutationToDom();
    var oldMutation = oldMutationDom && Blockly.Xml.domToText(oldMutationDom);
    // Switch off rendering while the source block is rebuilt.
    var savedRendered = block.rendered;
    block.rendered = false;
    // Update the mutation
    if (update) update.call(this);
    // Allow the source block to rebuild itself.
    this.updateShape_();
    // Restore rendering and show the changes.
    block.rendered = savedRendered;
    // Mutation may have added some elements that need initializing.
    block.initSvg();
    // Ensure that any bump is part of this mutation's event group.
    var group = Blockly.Events.getGroup();
    var newMutationDom = block.mutationToDom();
    var newMutation = newMutationDom && Blockly.Xml.domToText(newMutationDom);
    if (oldMutation != newMutation) {
      Blockly.Events.fire(new Blockly.Events.BlockChange(
          block, 'mutation', null, oldMutation, newMutation));
      setTimeout(function() {
        Blockly.Events.setGroup(group);
        block.bumpNeighbours();
        Blockly.Events.setGroup(false);
      }, Blockly.BUMP_DELAY);
    }
    if (block.rendered) {
      block.render();
    }
    Blockly.Events.setGroup(false);
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @this Blockly.Block
   * @private
   */
  updateShape_: function() {
    var that = this;
    // Delete everything.
    if (this.getInput('ELSE')) {
      this.removeInput('ELSE');
      this.removeInput('ELSETITLE');
      this.removeInput('ELSEBUTTONS');
    }
    var i = 1;
    while (this.getInput('IF' + i)) {
      this.removeInput('IF' + i);
      this.removeInput('IFTITLE' + i);
      this.removeInput('IFBUTTONS' + i);
      this.removeInput('DO' + i);
      i++;
    }
    // Rebuild block.
    for (var i = 1; i <= this.elseifCount_; i++) {
      var removeElseIf = function(arg) {
        return function() {
          that.removeElseIf_(arg);
        };
      }(i);
      this.appendValueInput('IF' + i)
          .setCheck('Boolean')
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_ELSEIF']);
      this.appendDummyInput('IFTITLE' + i)
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_THEN']);
      this.appendDummyInput('IFBUTTONS' + i)
          .appendField(
              new Blockly.FieldImage(this.REMOVE_IMAGE_DATAURI, 24, 24, "*", removeElseIf, false))
          .setAlign(Blockly.ALIGN_RIGHT);
      this.appendStatementInput('DO' + i);
    }
    if (this.elseCount_) {
      this.appendDummyInput('ELSETITLE')
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_ELSE']);
      this.appendDummyInput('ELSEBUTTONS')
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField(
              new Blockly.FieldImage(this.REMOVE_IMAGE_DATAURI, 24, 24, "*", that.removeElse_.bind(that), false));
      this.appendStatementInput('ELSE');
    }
    if (this.getInput('ADDBUTTON')) this.removeInput('ADDBUTTON');
    var that = this;
    var addElseIf = function() {
      return function() {
        if (that.elseCount_ == 0) {
          that.addElse_();
        } else {
          if (!that.elseifCount_) that.elseifCount_ = 0;
          that.addElseIf_();
        }
      };
    }();
    this.appendDummyInput('ADDBUTTON')
        .appendField(
            new Blockly.FieldImage(this.ADD_IMAGE_DATAURI, 24, 24, "*", addElseIf, false));
  },
  /**
   * Reconstructs the block with all child blocks attached.
   */
  rebuildShape_: function() {
    var valueConnections = [null];
    var statementConnections = [null];
    var elseStatementConnection = null;

    if (this.getInput('ELSE')) {
      elseStatementConnection = this.getInput('ELSE').connection.targetConnection;
    }
    var i = 1;
    while (this.getInput('IF' + i)) {
      var inputIf = this.getInput('IF' + i);
      var inputDo = this.getInput('DO' + i);
      valueConnections.push(inputIf.connection.targetConnection);
      statementConnections.push(inputDo.connection.targetConnection);
      i++;
    }
    this.updateShape_();
    this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
  },
  /**
   * Reconnects child blocks.
   * @param {!Array<?Blockly.RenderedConnection>} valueConnections List of value
   * connectsions for if input.
   * @param {!Array<?Blockly.RenderedConnection>} statementConnections List of
   * statement connections for do input.
   * @param {?Blockly.RenderedConnection} elseStatementConnection Statement
   * connection for else input.
   */
  reconnectChildBlocks_: function(valueConnections, statementConnections,
      elseStatementConnection) {
    for (var i = 1; i <= this.elseifCount_; i++) {
      Blockly.Mutator.reconnect(valueConnections[i], this, 'IF' + i);
      Blockly.Mutator.reconnect(statementConnections[i], this, 'DO' + i);
    }
    Blockly.Mutator.reconnect(elseStatementConnection, this, 'ELSE');
  }
};

Blockly.defineBlocksWithJsonArray([  // BEGIN JSON EXTRACT
  // Block for boolean data type: true and false.
  {
    "type": "logic_boolean",
    "message0": "%1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "BOOL",
        "options": [
          ["%{BKY_LOGIC_BOOLEAN_TRUE}", "TRUE"],
          ["%{BKY_LOGIC_BOOLEAN_FALSE}", "FALSE"]
        ]
      }
    ],
    "output": "Boolean",
    "outputShape": Blockly.OUTPUT_SHAPE_HEXAGONAL,
    "style": "logic_blocks",
    "tooltip": "%{BKY_LOGIC_BOOLEAN_TOOLTIP}",
    "helpUrl": "%{BKY_LOGIC_BOOLEAN_HELPURL}"
  },
  // Block for if/elseif/else condition.
  /*
  pxtblockly: define controls_if using JS syntax
  {
    "type": "controls_if",
    "message0": "%{BKY_CONTROLS_IF_MSG_IF} %1",
    "args0": [
      {
        "type": "input_value",
        "name": "IF0",
        "check": "Boolean"
      }
    ],
    "message1": "%{BKY_CONTROLS_IF_MSG_THEN} %1",
    "args1": [
      {
        "type": "input_statement",
        "name": "DO0"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "logic_blocks",
    "helpUrl": "%{BKY_CONTROLS_IF_HELPURL}",
    "mutator": "controls_if_mutator",
    "extensions": ["controls_if_tooltip"]
  },*/
  // If/else block that does not use a mutator.
  {
    "type": "controls_ifelse",
    "message0": "%{BKY_CONTROLS_IF_MSG_IF} %1 %{BKY_CONTROLS_IF_MSG_THEN}",
    "args0": [
      {
        "type": "input_value",
        "name": "IF0",
        "check": "Boolean"
      }
    ],
    "message1": "%1",
    "args1": [
      {
        "type": "input_statement",
        "name": "DO0"
      }
    ],
    "message2": "%{BKY_CONTROLS_IF_MSG_ELSE}",
    "message3": "%1",
    "args3": [
      {
        "type": "input_statement",
        "name": "ELSE"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "logic_blocks",
    "tooltip": "%{BKYCONTROLS_IF_TOOLTIP_2}",
    "helpUrl": "%{BKY_CONTROLS_IF_HELPURL}",
    "extensions": ["controls_if_tooltip"]
  },
  // Block for comparison operator.
  {
    "type": "logic_compare",
    "message0": "%1 %2 %3",
    "args0": [
      {
        "type": "input_value",
        "name": "A"
      },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["=", "EQ"],
          ["\u2260", "NEQ"],
          ["\u200F<", "LT"],
          ["\u200F\u2264", "LTE"],
          ["\u200F>", "GT"],
          ["\u200F\u2265", "GTE"]
        ]
      },
      {
        "type": "input_value",
        "name": "B"
      }
    ],
    "inputsInline": true,
    "output": "Boolean",
    "outputShape": Blockly.OUTPUT_SHAPE_HEXAGONAL,
    "style": "logic_blocks",
    "helpUrl": "%{BKY_LOGIC_COMPARE_HELPURL}",
    "extensions": ["logic_compare", "logic_op_tooltip"]
  },
  // Block for logical operations: 'and', 'or'.
  {
    "type": "logic_operation",
    "message0": "%1 %2 %3",
    "args0": [
      {
        "type": "input_value",
        "name": "A",
        "check": "Boolean"
      },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["%{BKY_LOGIC_OPERATION_AND}", "AND"],
          ["%{BKY_LOGIC_OPERATION_OR}", "OR"]
        ]
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Boolean"
      }
    ],
    "inputsInline": true,
    "output": "Boolean",
    "outputShape": Blockly.OUTPUT_SHAPE_HEXAGONAL,
    "style": "logic_blocks",
    "helpUrl": "%{BKY_LOGIC_OPERATION_HELPURL}",
    "extensions": ["logic_op_tooltip"]
  },
  // Block for negation.
  {
    "type": "logic_negate",
    "message0": "%{BKY_LOGIC_NEGATE_TITLE}",
    "args0": [
      {
        "type": "input_value",
        "name": "BOOL",
        "check": "Boolean"
      }
    ],
    "output": "Boolean",
    "outputShape": Blockly.OUTPUT_SHAPE_HEXAGONAL,
    "style": "logic_blocks",
    "tooltip": "%{BKY_LOGIC_NEGATE_TOOLTIP}",
    "helpUrl": "%{BKY_LOGIC_NEGATE_HELPURL}"
  },
  // Block for null data type.
  {
    "type": "logic_null",
    "message0": "%{BKY_LOGIC_NULL}",
    "output": null,
    "style": "logic_blocks",
    "tooltip": "%{BKY_LOGIC_NULL_TOOLTIP}",
    "helpUrl": "%{BKY_LOGIC_NULL_HELPURL}"
  },
  // Block for ternary operator.
  {
    "type": "logic_ternary",
    "message0": "%{BKY_LOGIC_TERNARY_CONDITION} %1",
    "args0": [
      {
        "type": "input_value",
        "name": "IF",
        "check": "Boolean"
      }
    ],
    "message1": "%{BKY_LOGIC_TERNARY_IF_TRUE} %1",
    "args1": [
      {
        "type": "input_value",
        "name": "THEN"
      }
    ],
    "message2": "%{BKY_LOGIC_TERNARY_IF_FALSE} %1",
    "args2": [
      {
        "type": "input_value",
        "name": "ELSE"
      }
    ],
    "output": null,
    "style": "logic_blocks",
    "tooltip": "%{BKY_LOGIC_TERNARY_TOOLTIP}",
    "helpUrl": "%{BKY_LOGIC_TERNARY_HELPURL}",
    "extensions": ["logic_ternary"]
  }
]);  // END JSON EXTRACT (Do not delete this comment.)

Blockly.defineBlocksWithJsonArray([ // Mutator blocks. Do not extract.
  // Block representing the if statement in the controls_if mutator.
  {
    "type": "controls_if_if",
    "message0": "%{BKY_CONTROLS_IF_IF_TITLE_IF}",
    "nextStatement": null,
    "enableContextMenu": false,
    "style": "logic_blocks",
    "tooltip": "%{BKY_CONTROLS_IF_IF_TOOLTIP}"
  },
  // Block representing the else-if statement in the controls_if mutator.
  {
    "type": "controls_if_elseif",
    "message0": "%{BKY_CONTROLS_IF_ELSEIF_TITLE_ELSEIF}",
    "previousStatement": null,
    "nextStatement": null,
    "enableContextMenu": false,
    "style": "logic_blocks",
    "tooltip": "%{BKY_CONTROLS_IF_ELSEIF_TOOLTIP}"
  },
  // Block representing the else statement in the controls_if mutator.
  {
    "type": "controls_if_else",
    "message0": "%{BKY_CONTROLS_IF_ELSE_TITLE_ELSE}",
    "previousStatement": null,
    "enableContextMenu": false,
    "style": "logic_blocks",
    "tooltip": "%{BKY_CONTROLS_IF_ELSE_TOOLTIP}"
  }
]);

/**
 * Tooltip text, keyed by block OP value. Used by logic_compare and
 * logic_operation blocks.
 * @see {Blockly.Extensions#buildTooltipForDropdown}
 * @package
 * @readonly
 */
Blockly.Constants.Logic.TOOLTIPS_BY_OP = {
  // logic_compare
  'EQ': '%{BKY_LOGIC_COMPARE_TOOLTIP_EQ}',
  'NEQ': '%{BKY_LOGIC_COMPARE_TOOLTIP_NEQ}',
  'LT': '%{BKY_LOGIC_COMPARE_TOOLTIP_LT}',
  'LTE': '%{BKY_LOGIC_COMPARE_TOOLTIP_LTE}',
  'GT': '%{BKY_LOGIC_COMPARE_TOOLTIP_GT}',
  'GTE': '%{BKY_LOGIC_COMPARE_TOOLTIP_GTE}',

  // logic_operation
  'AND': '%{BKY_LOGIC_OPERATION_TOOLTIP_AND}',
  'OR': '%{BKY_LOGIC_OPERATION_TOOLTIP_OR}'
};

Blockly.Extensions.register('logic_op_tooltip',
    Blockly.Extensions.buildTooltipForDropdown(
        'OP', Blockly.Constants.Logic.TOOLTIPS_BY_OP));

/**
 * Mutator methods added to controls_if blocks.
 * @mixin
 * @augments Blockly.Block
 * @package
 * @readonly
 */
Blockly.Constants.Logic.CONTROLS_IF_MUTATOR_MIXIN = {
  elseifCount_: 0,
  elseCount_: 0,

  /**
   * Don't automatically add STATEMENT_PREFIX and STATEMENT_SUFFIX to generated
   * code.  These will be handled manually in this block's generators.
   */
  suppressPrefixSuffix: true,

  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this {Blockly.Block}
   */
  mutationToDom: function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return null;
    }
    var container = Blockly.utils.xml.createElement('mutation');
    if (this.elseifCount_) {
      container.setAttribute('elseif', this.elseifCount_);
    }
    if (this.elseCount_) {
      container.setAttribute('else', 1);
    }
    return container;
  },
  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this {Blockly.Block}
   */
  domToMutation: function(xmlElement) {
    this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif'), 10) || 0;
    this.elseCount_ = parseInt(xmlElement.getAttribute('else'), 10) || 0;
    this.rebuildShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this {Blockly.Block}
   */
  decompose: function(workspace) {
    var containerBlock = workspace.newBlock('controls_if_if');
    containerBlock.initSvg();
    var connection = containerBlock.nextConnection;
    for (var i = 1; i <= this.elseifCount_; i++) {
      var elseifBlock = workspace.newBlock('controls_if_elseif');
      elseifBlock.initSvg();
      connection.connect(elseifBlock.previousConnection);
      connection = elseifBlock.nextConnection;
    }
    if (this.elseCount_) {
      var elseBlock = workspace.newBlock('controls_if_else');
      elseBlock.initSvg();
      connection.connect(elseBlock.previousConnection);
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this {Blockly.Block}
   */
  compose: function(containerBlock) {
    var clauseBlock = containerBlock.nextConnection.targetBlock();
    // Count number of inputs.
    this.elseifCount_ = 0;
    this.elseCount_ = 0;
    var valueConnections = [null];
    var statementConnections = [null];
    var elseStatementConnection = null;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'controls_if_elseif':
          this.elseifCount_++;
          valueConnections.push(clauseBlock.valueConnection_);
          statementConnections.push(clauseBlock.statementConnection_);
          break;
        case 'controls_if_else':
          this.elseCount_++;
          elseStatementConnection = clauseBlock.statementConnection_;
          break;
        default:
          throw TypeError('Unknown block type: ' + clauseBlock.type);
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
    this.updateShape_();
    // Reconnect any child blocks.
    this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this {Blockly.Block}
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.nextConnection.targetBlock();
    var i = 1;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'controls_if_elseif':
          var inputIf = this.getInput('IF' + i);
          var inputDo = this.getInput('DO' + i);
          clauseBlock.valueConnection_ =
              inputIf && inputIf.connection.targetConnection;
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          i++;
          break;
        case 'controls_if_else':
          var inputDo = this.getInput('ELSE');
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          break;
        default:
          throw TypeError('Unknown block type: ' + clauseBlock.type);
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Reconstructs the block with all child blocks attached.
   * @this {Blockly.Block}
   */
  rebuildShape_: function() {
    var valueConnections = [null];
    var statementConnections = [null];
    var elseStatementConnection = null;

    if (this.getInput('ELSE')) {
      elseStatementConnection = this.getInput('ELSE').connection.targetConnection;
    }
    var i = 1;
    while (this.getInput('IF' + i)) {
      var inputIf = this.getInput('IF' + i);
      var inputDo = this.getInput('DO' + i);
      valueConnections.push(inputIf.connection.targetConnection);
      statementConnections.push(inputDo.connection.targetConnection);
      i++;
    }
    this.updateShape_();
    this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @this {Blockly.Block}
   * @private
   */
  updateShape_: function() {
    // Delete everything.
    if (this.getInput('ELSE')) {
      this.removeInput('ELSE');
    }
    var i = 1;
    while (this.getInput('IF' + i)) {
      this.removeInput('IF' + i);
      this.removeInput('DO' + i);
      i++;
    }
    // Rebuild block.
    for (i = 1; i <= this.elseifCount_; i++) {
      this.appendValueInput('IF' + i)
          .setCheck('Boolean')
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_ELSEIF']);
      this.appendStatementInput('DO' + i)
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_THEN']);
    }
    if (this.elseCount_) {
      this.appendStatementInput('ELSE')
          .appendField(Blockly.Msg['CONTROLS_IF_MSG_ELSE']);
    }
  },
  /**
   * Reconnects child blocks.
   * @param {!Array.<?Blockly.RenderedConnection>} valueConnections List of
   * value connections for 'if' input.
   * @param {!Array.<?Blockly.RenderedConnection>} statementConnections List of
   * statement connections for 'do' input.
   * @param {?Blockly.RenderedConnection} elseStatementConnection Statement
   * connection for else input.
   * @this {Blockly.Block}
   */
  reconnectChildBlocks_: function(valueConnections, statementConnections,
      elseStatementConnection) {
    for (var i = 1; i <= this.elseifCount_; i++) {
      Blockly.Mutator.reconnect(valueConnections[i], this, 'IF' + i);
      Blockly.Mutator.reconnect(statementConnections[i], this, 'DO' + i);
    }
    Blockly.Mutator.reconnect(elseStatementConnection, this, 'ELSE');
  }
};

/**
 * "controls_if" extension function. Adds mutator, shape updating methods, and
 * dynamic tooltip to "controls_if" blocks.
 * @this {Blockly.Block}
 * @package
 */
Blockly.Constants.Logic.CONTROLS_IF_TOOLTIP_EXTENSION = function() {

  this.setTooltip(function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return Blockly.Msg['CONTROLS_IF_TOOLTIP_1'];
    } else if (!this.elseifCount_ && this.elseCount_) {
      return Blockly.Msg['CONTROLS_IF_TOOLTIP_2'];
    } else if (this.elseifCount_ && !this.elseCount_) {
      return Blockly.Msg['CONTROLS_IF_TOOLTIP_3'];
    } else if (this.elseifCount_ && this.elseCount_) {
      return Blockly.Msg['CONTROLS_IF_TOOLTIP_4'];
    }
    return '';
  }.bind(this));
};

Blockly.Extensions.register('controls_if_tooltip',
    Blockly.Constants.Logic.CONTROLS_IF_TOOLTIP_EXTENSION);

/**
 * Adds dynamic type validation for the left and right sides of a logic_compare
 * block.
 * @mixin
 * @augments Blockly.Block
 * @package
 * @readonly
 */
Blockly.Constants.Logic.LOGIC_COMPARE_ONCHANGE_MIXIN = {
  /**
   * Called whenever anything on the workspace changes.
   * Prevent mismatched types from being compared.
   * @param {!Blockly.Events.Abstract} e Change event.
   * @this {Blockly.Block}
   */
  onchange: function(e) {
    if (!this.prevBlocks_) {
      this.prevBlocks_ = [null, null];
    }

    var blockA = this.getInputTargetBlock('A');
    var blockB = this.getInputTargetBlock('B');
    // Disconnect blocks that existed prior to this change if they don't match.
    if (blockA && blockB &&
        !blockA.outputConnection.checkType(blockB.outputConnection)) {
      // Mismatch between two inputs.  Revert the block connections,
      // bumping away the newly connected block(s).
      Blockly.Events.setGroup(e.group);
      var prevA = this.prevBlocks_[0];
      if (prevA !== blockA) {
        blockA.unplug();
        if (prevA && !prevA.isDisposed() && !prevA.isShadow()) {
          // The shadow block is automatically replaced during unplug().
          this.getInput('A').connection.connect(prevA.outputConnection);
        }
      }
      var prevB = this.prevBlocks_[1];
      if (prevB !== blockB) {
        blockB.unplug();
        if (prevB && !prevB.isDisposed() && !prevB.isShadow()) {
          // The shadow block is automatically replaced during unplug().
          this.getInput('B').connection.connect(prevB.outputConnection);
        }
      }
      this.bumpNeighbours();
      Blockly.Events.setGroup(false);
    }
    this.prevBlocks_[0] = this.getInputTargetBlock('A');
    this.prevBlocks_[1] = this.getInputTargetBlock('B');
  }
};

/**
 * "logic_compare" extension function. Adds type left and right side type
 * checking to "logic_compare" blocks.
 * @this {Blockly.Block}
 * @package
 * @readonly
 */
Blockly.Constants.Logic.LOGIC_COMPARE_EXTENSION = function() {
  // Add onchange handler to ensure types are compatible.
  this.mixin(Blockly.Constants.Logic.LOGIC_COMPARE_ONCHANGE_MIXIN);
};

Blockly.Extensions.register('logic_compare',
    Blockly.Constants.Logic.LOGIC_COMPARE_EXTENSION);

/**
 * Adds type coordination between inputs and output.
 * @mixin
 * @augments Blockly.Block
 * @package
 * @readonly
 */
Blockly.Constants.Logic.LOGIC_TERNARY_ONCHANGE_MIXIN = {
  prevParentConnection_: null,

  /**
   * Called whenever anything on the workspace changes.
   * Prevent mismatched types.
   * @param {!Blockly.Events.Abstract} e Change event.
   * @this {Blockly.Block}
   */
  onchange: function(e) {
    var blockA = this.getInputTargetBlock('THEN');
    var blockB = this.getInputTargetBlock('ELSE');
    var parentConnection = this.outputConnection.targetConnection;
    // Disconnect blocks that existed prior to this change if they don't match.
    if ((blockA || blockB) && parentConnection) {
      for (var i = 0; i < 2; i++) {
        var block = (i == 1) ? blockA : blockB;
        if (block && !block.outputConnection.checkType(parentConnection)) {
          // Ensure that any disconnections are grouped with the causing event.
          Blockly.Events.setGroup(e.group);
          if (parentConnection === this.prevParentConnection_) {
            this.unplug();
            parentConnection.getSourceBlock().bumpNeighbours();
          } else {
            block.unplug();
            block.bumpNeighbours();
          }
          Blockly.Events.setGroup(false);
        }
      }
    }
    this.prevParentConnection_ = parentConnection;
  }
};

Blockly.Extensions.registerMixin('logic_ternary',
    Blockly.Constants.Logic.LOGIC_TERNARY_ONCHANGE_MIXIN);
