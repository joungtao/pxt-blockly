/**
 * @license
 * PXT Blockly
 *
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * https://github.com/Microsoft/pxt-blockly
 * 
 * See LICENSE file for details.
 */

/**
 * @fileoverview note-picker input field.
 */

/// <reference path="../localtypings/blockly.d.ts" />

'use strict';
goog.provide('Blockly.FieldNote');

goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.ui.ColorButton');
goog.require('goog.dom');
goog.require('Blockly.Field');
goog.require('Blockly.Toolbox')
goog.require('Blockly.FieldNumber');

enum pianoSize {
    small = 12,
    medium = 36,
    large = 60
}

namespace pxtblocky {
    //  Class for a note input field.
    export class FieldNote extends Blockly.FieldNumber {
        //  value of the field
        private note_: string;

        //  text to display in the field 
        private text_: string;

        //  colour of the block
        private colour_: string;

        /**
         * default number of piano keys
         * @type {number}
         * @private
         */
        private nKeys_: number = pianoSize.medium;

        /**
         * Absolute error for note frequency identification (Hz)
         * @type {number}
         */
        eps: number = 2;

        /**
         * array of notes frequency
         * @type {Array.<number>}
         * @private
         */
        private noteFreq_: Array<number> = [];

        /**
         * array of notes names
         * @type {Array.<string>}
         * @private
         */
        private noteName_: Array<string> = [];

        /**
         * @param {string} note The initial note in string format.
         * @param {Function=} opt_validator A function that is executed when a new
         *     note is selected.  Its sole argument is the new note value.  Its
         *     return value becomes the selected note
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        constructor(note: string, colour: string | number, opt_validator?: any) {
            super(note);
            FieldNote.superClass_.constructor.call(this, note, opt_validator);
            this.note_ = note;
            let hue = Number(colour);
            if (!isNaN(hue))
                this.colour_ = Blockly.hueToRgb(hue);
            else
                this.colour_ = colour.toString();
        }

        /**
         * Ensure that only a non negative number may be entered.
         * @param {string} text The user's text.
         * @return {?string} A string representing a valid positive number, or null if invalid.
         */
        classValidator(text: string) {
            if (text === null) {
                return null;
            }
            text = String(text);

            let n = parseFloat(text || "0");
            if (isNaN(n) || n < 0) {
                // Invalid number.
                return null;
            }
            // Get the value in range.
            return String(n);
        }

        /**
         * Install this field on a block.
         */
        init() {
            FieldNote.superClass_.init.call(this);
            this.noteFreq_.length = 0;
            this.noteName_.length = 0;
            let thisField = this;
            //  Create arrays of name/frequency of the notes
            createNotesArray();
            this.setValue(this.callValidator(this.getValue()));

            /**
             * return next note of a piano key
             * @param {string} note current note
             * @return {string} next note
             * @private
             */
            function nextNote(note: string): string {
                switch (note) {
                    case "A#":
                        return "B";
                    case "B":
                        return "C";
                    case "C#":
                        return "D";
                    case "D#":
                        return "E";
                    case "E":
                        return "F";
                    case "F#":
                        return "G";
                    case "G#":
                        return "A";
                }
                return note + "#";
            }
            /**
             * return next note prefix
             * @param {string} prefix current note prefix
             * @return {string} next note prefix
             * @private
             */
            function nextNotePrefix(prefix: string): string {
                switch (prefix) {
                    case "Deep":
                        return "Low";
                    case "Low":
                        return "Middle";
                    case "Middle":
                        if (thisField.nKeys_ == pianoSize.medium)
                            return "High";
                        return "Tenor";
                    case "Tenor":
                        return "High";
                }
            }
            /**
             * create Array of notes name and frequencies
             * @private
             */
            function createNotesArray() {
                let prefix: string;
                let curNote: string = "C";

                let keyNumber: number;
                // set piano start key number and key prefix (keyNumbers -> https://en.wikipedia.org/wiki/Piano_key_frequencies)
                switch (thisField.nKeys_) {
                    case pianoSize.small:
                        keyNumber = 40;
                        //  no prefix for a single octave
                        prefix = "";
                        break;
                    case pianoSize.medium:
                        keyNumber = 28;
                        prefix = "Low";
                        break;
                    case pianoSize.large:
                        keyNumber = 16;
                        prefix = "Deep";
                        break;
                }
                for (let i = 0; i < thisField.nKeys_; i++) {
                    // set name of the i note
                    thisField.noteName_.push(prefix + " " + curNote);
                    // get frequency using math formula -> https://en.wikipedia.org/wiki/Piano_key_frequencies
                    let curFreq = Math.pow(2, (keyNumber - 49) / 12) * 440;
                    // set frequency of the i note
                    thisField.noteFreq_.push(curFreq);
                    // get name of the next note
                    curNote = nextNote(curNote);
                    if ((i + 1) % 12 == 0)
                        prefix = nextNotePrefix(prefix);
                    // increment keyNumber
                    keyNumber++;
                }
            }
        }
        /**
         * Return the current note frequency.
         * @return {string} Current note in string format.
         */
        getValue(): string {
            return this.note_;
        }

        /**
         * Set the note.
         * @param {string} note The new note in string format.
         */
        setValue(note: string) {
            note = String(parseFloat(note || "0"));
            if (isNaN(Number(note)) || Number(note) < 0)
                return;
            if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
                this.note_ != note) {
                Blockly.Events.fire(new Blockly.Events.Change(
                    this.sourceBlock_, "field", this.name, String(this.note_), String(note)));
            }
            this.note_ = this.callValidator(note);
            this.setText(this.getNoteName_());
        }

        /**
         * Get the text from this field.  Used when the block is collapsed.
         * @return {string} Current text.
         */
        getText(): string {
            if (Math.floor(Number(this.note_)) == Number(this.note_))
                return Number(this.note_).toFixed(0);
            return Number(this.note_).toFixed(2);
        }

        /**
         * Set the text in this field and NOT fire a change event.
         * @param {*} newText New text.
         */
        setText(newText: string) {
            if (newText === null) {
                // No change if null.
                return;
            }
            newText = String(newText);
            if (!isNaN(Number(newText)))
                newText = this.getNoteName_();

            if (newText === this.text_) {
                // No change.
                return;
            }
            Blockly.Field.prototype.setText.call(this, newText);
        }

        /**
        * get the note name to be displayed in the field
        * @return {string} note name
        * @private
        */
        private getNoteName_(): string {
            let note: string = this.getValue();
            let text: string = note.toString();
            for (let i: number = 0; i < this.nKeys_; i++) {
                if (Math.abs(this.noteFreq_[i] - Number(note)) < this.eps)
                    return this.noteName_[i];
            }
            if (!isNaN(Number(note)))
                text += " Hz";
            return text;
        }

        /**
         * Set a custom number of keys for this field.
         * @param {number} nkeys Number of keys for this block,
         *     or 26 to use default.
         * @return {!Blockly.FieldNote} Returns itself (for method chaining).
         */
        setNumberOfKeys(size: number): FieldNote {
            if (size != pianoSize.small && size != pianoSize.medium && size != pianoSize.large)
                return this;
            this.nKeys_ = size;
            return this;
        }

        /**
         * Create a piano under the note field.
         */
        showEditor_(opt_quietInput?: boolean): void {
            //  change Note name to number frequency
            Blockly.FieldNumber.prototype.setText.call(this, this.getText());

            FieldNote.superClass_.showEditor_.call(this, true);

            let pianoWidth: number;
            let pianoHeight: number;
            let keyWidth: number = 22;
            let keyHeight: number = 90;
            let labelHeight: number;
            let prevNextHeight: number;
            let whiteKeyCounter: number = 0;
            let selectedKeyColor: string = "yellowgreen";
            let soundingKeys: number = 0;
            let thisField = this;
            //  Record windowSize and scrollOffset before adding the piano.
            let windowSize = goog.dom.getViewportSize();
            let pagination: boolean = false;
            let mobile: boolean = false;
            let editorWidth = windowSize.width;
            let piano: Array<goog.ui.ColorButton> = [];
            //  initializate
            pianoWidth = keyWidth * (this.nKeys_ - (this.nKeys_ / 12 * 5));
            pianoHeight = keyHeight;

            //  Create the piano using Closure (colorButton).
            for (let i = 0; i < this.nKeys_; i++) {
                piano.push(new goog.ui.ColorButton());
            }

            if (editorWidth < pianoWidth) {
                pagination = true;
                pianoWidth = 7 * keyWidth;
            }
            //  Check if Mobile, pagination -> true
            let quietInput = opt_quietInput || false;
            if (!quietInput && (goog.userAgent.MOBILE || goog.userAgent.ANDROID)) {
                pagination = true;
                mobile = true;
                let r = keyWidth / keyHeight;
                keyWidth = Math.ceil(windowSize.width / 7);
                keyHeight = Math.ceil(keyWidth / r);
                pianoWidth = 7 * keyWidth;
                pianoHeight = keyHeight;
                labelHeight = keyWidth / 1.5;
                prevNextHeight = keyWidth / 1.5;
            }

            //  create piano div
            let div = Blockly.WidgetDiv.DIV;
            let pianoDiv = goog.dom.createDom("div", {});
            pianoDiv.className = "blocklyPianoDiv";
            div.appendChild(pianoDiv);
            let scrollOffset = goog.style.getViewportPageOffset(document);
            //let pianoHeight = keyHeight + div.scrollHeight + 5;
            let xy = this.getAbsoluteXY_();
            let borderBBox = this.getScaledBBox_();
            let topPosition: number = 0, leftPosition: number = 0;
            //  Flip the piano vertically if off the bottom (only in web view).
            if (!mobile) {
                if (xy.y + pianoHeight + borderBBox.height >=
                    windowSize.height + scrollOffset.y) {
                    topPosition = -(pianoHeight + borderBBox.height);
                }
                if (this.sourceBlock_.RTL) {
                    xy.x += borderBBox.width;
                    xy.x -= pianoWidth;
                    leftPosition += borderBBox.width;
                    leftPosition -= pianoWidth;
                    // Don't go offscreen left.
                    if (xy.x < scrollOffset.x) {
                        leftPosition = scrollOffset.x - xy.x;
                    }
                } else {
                    // Don't go offscreen right.
                    if (xy.x > windowSize.width + scrollOffset.x - pianoWidth) {
                        leftPosition -= xy.x - (windowSize.width + scrollOffset.x - pianoWidth);
                    }
                }
            } else {
                leftPosition = -(<HTMLElement>document.getElementsByClassName("blocklyWidgetDiv")[0]).offsetLeft;   //+ ((windowSize.width - this.pianoWidth_) / 2);
                topPosition = windowSize.height - (keyHeight + labelHeight + prevNextHeight) - (<HTMLElement>document.getElementsByClassName("blocklyWidgetDiv")[0]).offsetTop - borderBBox.height;
            }

            //  save all changes in the same group of events
            Blockly.Events.setGroup(true);

            //  render piano keys
            let octaveCounter = 0;
            let currentSelectedKey: goog.ui.ColorButton = null;
            let previousColor: string;
            for (let i = 0; i < this.nKeys_; i++) {
                if (i > 0 && i % 12 == 0)
                    octaveCounter++;
                let key = piano[i];
                //  What color is i key
                let bgColor = (isWhite(i)) ? "white" : "black";
                let width = getKeyWidth(i);
                let height = getKeyHeight(i);
                let position = getPosition(i);

                //  modify original position in pagination
                if (pagination && i >= 12)
                    position -= 7 * octaveCounter * keyWidth;
                let style = getKeyStyle(bgColor, width, height, position + leftPosition, topPosition, isWhite(i) ? 1000 : 1001, isWhite(i) ? this.colour_ : "black", mobile);
                key.setContent(style);
                key.setId(this.noteName_[i]);
                key.render(pianoDiv);
                let script = key.getContent() as HTMLElement;
                script.setAttribute("tag", this.noteFreq_[i].toString());

                //  highlight current selected key
                if (Math.abs(this.noteFreq_[i] - Number(this.getValue())) < this.eps) {
                    previousColor = script.style.backgroundColor;
                    script.style.backgroundColor = selectedKeyColor;
                    currentSelectedKey = key;
                }

                //  Listener when a new key is selected
                if (!mobile) {
                    goog.events.listen(key.getElement(),
                        goog.events.EventType.MOUSEDOWN, soundKey
                        , false, key
                    );
                } else {
                    //  Listener when a new key is selected in MOBILE
                    goog.events.listen(key.getElement(),
                        goog.events.EventType.TOUCHSTART, soundKey
                        , false, key
                    );
                }
                //  Listener when the mouse is over a key
                goog.events.listen(key.getElement(),
                    goog.events.EventType.MOUSEOVER,
                    function () {
                        let script = showNoteLabel.getContent() as HTMLElement;
                        script.innerText = this.getId();
                        this.labelHeight_ = (<HTMLElement>document.getElementsByClassName("blocklyNoteLabel")[0]).offsetHeight;
                    }, false, key
                );

                //  increment white key counter
                if (isWhite(i))
                    whiteKeyCounter++;
                // set octaves different from first octave invisible
                if (pagination && i > 11)
                    key.setVisible(false);
            }

            // event listener to stop sound
            if (!mobile) {
                document.addEventListener(goog.events.EventType.MOUSEUP, function () {
                    AudioContextManager.stop();
                });
            } else {
                // event listener to stop sound on MOBILE
                document.addEventListener(goog.events.EventType.TOUCHEND, function () {
                    AudioContextManager.stop();
                }, false);
            }

            //  render note label
            let showNoteLabel = new goog.ui.ColorButton();
            let showNoteStyle = getShowNoteStyle(topPosition, leftPosition, mobile);
            showNoteLabel.setContent(showNoteStyle);
            showNoteLabel.render(pianoDiv);
            let scriptLabel = showNoteLabel.getContent() as HTMLElement;
            scriptLabel.innerText = "-";
            labelHeight = (<HTMLElement>document.getElementsByClassName("blocklyNoteLabel")[0]).offsetHeight;

            // create next and previous buttons for pagination
            let prevButton = new goog.ui.ColorButton();
            let nextButton = new goog.ui.ColorButton();
            let prevButtonStyle = getNextPrevStyle(topPosition, leftPosition, true, mobile);
            let nextButtonStyle = getNextPrevStyle(topPosition, leftPosition, false, mobile);
            if (pagination) {
                scriptLabel.innerText = "Octave #1";
                labelHeight = (<HTMLElement>document.getElementsByClassName("blocklyNoteLabel")[0]).offsetHeight;
                //  render previous button
                let script: HTMLElement;
                prevButton.setContent(prevButtonStyle);
                prevButton.render(pianoDiv);
                script = prevButton.getContent() as HTMLElement;
                //  left arrow - previous button
                script.innerText = "<";
                //  render next button
                nextButton.setContent(nextButtonStyle);
                nextButton.render(pianoDiv);
                script = nextButton.getContent() as HTMLElement;
                //  right arrow - next button
                script.innerText = ">";

                let Npages = this.nKeys_ / 12;
                let currentPage = 0;
                goog.events.listen(prevButton.getElement(),
                    goog.events.EventType.MOUSEDOWN,
                    function () {
                        if (currentPage == 0) {
                            scriptLabel.innerText = "Octave #" + (currentPage + 1);
                            return;
                        }
                        let curFirstKey = currentPage * 12;
                        let newFirstKey = currentPage * 12 - 12;
                        //  hide current octave
                        for (let i = 0; i < 12; i++)
                            piano[i + curFirstKey].setVisible(false);
                        //  show new octave
                        for (let i = 0; i < 12; i++)
                            piano[i + newFirstKey].setVisible(true);
                        currentPage--;
                        scriptLabel.innerText = "Octave #" + (currentPage + 1);
                        this.labelHeight_ = (<HTMLElement>document.getElementsByClassName("blocklyNoteLabel")[0]).offsetHeight;
                    }, false, prevButton
                );
                goog.events.listen(nextButton.getElement(),
                    goog.events.EventType.MOUSEDOWN,
                    function () {
                        if (currentPage == Npages - 1) {
                            scriptLabel.innerText = "Octave #" + (currentPage + 1);
                            return;
                        }
                        let curFirstKey = currentPage * 12;
                        let newFirstKey = currentPage * 12 + 12;
                        //  hide current octave
                        for (let i = 0; i < 12; i++)
                            piano[i + curFirstKey].setVisible(false);
                        //  show new octave
                        for (let i = 0; i < 12; i++)
                            piano[i + newFirstKey].setVisible(true);
                        currentPage++;
                        scriptLabel.innerText = "Octave #" + (currentPage + 1);
                        this.labelHeight_ = (<HTMLElement>document.getElementsByClassName("blocklyNoteLabel")[0]).offsetHeight;
                    }, false, nextButton
                );
            }
            /** create the key sound
             * 
             */
            function soundKey() {
                let cnt = ++soundingKeys;
                let freq = this.getContent().getAttribute("tag");
                let script: HTMLElement;
                if (currentSelectedKey != null) {
                    script = currentSelectedKey.getContent() as HTMLElement;
                    script.style.backgroundColor = previousColor;
                }
                script = this.getContent() as HTMLElement;
                if (currentSelectedKey !== this) { // save color and change values only if is clicking different key
                    previousColor = script.style.backgroundColor;
                    thisField.setValue(thisField.callValidator(freq));
                    thisField.setText(thisField.callValidator(freq));
                }
                currentSelectedKey = this;
                script.style.backgroundColor = selectedKeyColor;
                Blockly.FieldTextInput.htmlInput_.value = thisField.getText();
                AudioContextManager.tone(freq);
                pxtblocky.FieldNote.superClass_.dispose.call(this);
            }
            /** get width of blockly editor space
             * @return {number} width of the blockly editor workspace
             * @private
             */
            function getEditorWidth(): number {
                let windowSize = goog.dom.getViewportSize();
                return windowSize.width;
            }
            /** get height of blockly editor space
             * @return {number} Height of the blockly editor workspace
             * @private
             */
            function getEditorHeight(): number {
                let editorHeight = document.getElementById("blocklyDiv").offsetHeight;
                return editorHeight;
            }
            /**
             * create a DOM to assing a style to the button (piano Key)
             * @param {string} bgColor color of the key background
             * @param {number} width width of the key
             * @param {number} heigth heigth of the key
             * @param {number} leftPosition horizontal position of the key
             * @param {number} topPosition vertical position of the key
             * @param {number} z_index z-index of the key
             * @param {string} keyBorderColour border color of the key
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getKeyStyle(bgColor: string, width: number, height: number, leftPosition: number, topPosition: number, z_index: number, keyBorderColour: string, isMobile: boolean) {
                let div = goog.dom.createDom("div",
                    {
                        "style": "background-color: " + bgColor
                        + "; width: " + width
                        + "px; height: " + height
                        + "px; left: " + leftPosition
                        + "px; top: " + topPosition
                        + "px; z-index: " + z_index
                        + ";   border-color: " + keyBorderColour
                        + ";"
                    });
                div.className = "blocklyNote";
                return div;
            }
            /**
             * create a DOM to assing a style to the note label
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private 
             */
            function getShowNoteStyle(topPosition: number, leftPosition: number, isMobile: boolean) {
                topPosition += keyHeight;
                if (isMobile)
                    topPosition += prevNextHeight;
                let div = goog.dom.createDom("div",
                    {
                        "style": "top: " + topPosition
                        + "px; left: " + leftPosition
                        + "px; background-color: " + thisField.colour_
                        + "; width: " + pianoWidth
                        + "px; border-color: " + thisField.colour_
                        + ";" + (isMobile ? " font-size: " + (labelHeight - 10) + "px; height: " + labelHeight + "px;" : "")
                    });
                div.className = "blocklyNoteLabel";
                return div;
            }
            /**
             * create a DOM to assing a style to the previous and next buttons
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isPrev true if is previous button, false otherwise
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private 
             */
            function getNextPrevStyle(topPosition: number, leftPosition: number, isPrev: boolean, isMobile: boolean) {
                //  x position of the prev/next button
                let xPosition = (isPrev ? 0 : (pianoWidth / 2)) + leftPosition;
                //  y position of the prev/next button
                let yPosition = (keyHeight + labelHeight + topPosition);
                if (isMobile)
                    yPosition = keyHeight + topPosition;
                let div = goog.dom.createDom("div",
                    {
                        "style": "top: " + yPosition
                        + "px; left: " + xPosition
                        + "px; "
                        + ";" + (isMobile ? "height: " + prevNextHeight + "px; font-size:" + (prevNextHeight - 10) + "px;" : "")
                        + "width: " + Math.ceil(pianoWidth / 2) + "px;"
                        + "background-color: " + thisField.colour_
                        + ";" + (isPrev ? "border-left-color: " : "border-right-color: ") + thisField.colour_
                        + ";" + (!isMobile ? "border-bottom-color: " + thisField.colour_ : "")
                        + ";"
                    });
                div.className = "blocklyNotePrevNext";
                return div;
            }

            /**
             * @param {number} idx index of the key
             * @return {boolean} true if key_idx is white
             * @private
             */
            function isWhite(idx: number): boolean {
                let octavePosition: number = idx % 12;
                if (octavePosition == 1 || octavePosition == 3 || octavePosition == 6 ||
                    octavePosition == 8 || octavePosition == 10)
                    return false;
                return true;
            }

            /**
             * get width of the piano key
             * @param {number} idx index of the key
             * @return {number} width of the key
             * @private
             */
            function getKeyWidth(idx: number): number {
                if (isWhite(idx))
                    return keyWidth;
                return keyWidth / 2;
            }

            /**
             * get height of the piano key
             * @param {number} idx index of the key
             * @return {number} height of the key
             * @private
             */
            function getKeyHeight(idx: number): number {
                if (isWhite(idx))
                    return keyHeight;
                return keyHeight / 2;
            }

            /**
             * get the position of the key in the piano
             * @param {number} idx index of the key
             * @return {number} position of the key
             */
            function getPosition(idx: number): number {
                let pos: number = (whiteKeyCounter * keyWidth);
                if (isWhite(idx))
                    return pos;
                return pos - (keyWidth / 4);
            }


        }
        /**
         * Close the note picker if this input is being deleted.
         */
        dispose() {
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.FieldTextInput.superClass_.dispose.call(this);
        }
    }
}


(Blockly as any).FieldNote = pxtblocky.FieldNote;