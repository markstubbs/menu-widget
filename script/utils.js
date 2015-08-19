/**
 *
 * @preserve Utils v0.1.0 - (c) Mark Stubbs 2015, freely distributable under the terms of the MIT license.
 *
 */

'use strict';

var Utils = {

    // Merges the property values of oSource with oTarget and returns oTarget
    merge: function (oTarget, oSource)
    {
        for (var sProperty in oSource) {
            if (oSource.hasOwnProperty(sProperty)) {
                oTarget[sProperty] = oSource[sProperty];
            }
        }
        return oTarget;
    },


    // *Shallow* compare of two objects for equality that works with IE8.
    areEqual: function (a, b)
    {
        // Create arrays of _enumerable_ property names.
        // This may not be sufficient for your needs - if so you'll need Object.getOwnPropertyNames (but then you'll give up IE8 compatibility)
        var aProps = Object.keys(a);
        var bProps = Object.keys(b);

        // If the number of properties are different the objects cannot be equal
        if (aProps.length !== bProps.length) {
            return false;
        }

        // Check each property value
        for (var i = 0, iMax = aProps.length; i < iMax; i++) {
            var propName = aProps[i];
            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        return true;
    }

};
