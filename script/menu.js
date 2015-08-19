/**
 *
 * @preserve menu v0.1.0 - (c) Mark Stubbs 2015, freely distributable under the terms of the MIT license.
 *
 */

'use strict';

Menu.nextAvailableId = 0;
Menu.nextAvailableRadioGroupId = 0;
Menu.shortcuts = [];

function Menu(sId, oOptions)
{
    var _this = this;
    var _id = null;
    var _elRoot;
    var _oListeners = {};
    var _iOpenSubMenuTimer;
    var _elCurrentActiveItem;
    var _bIgnoreClick = false;
    var _bCreateNextMenuGroup = false;
    var _iPressedKeyCode = 0;
    var _bJustGotFocus = false;

    // Default options
    var _oOptions = {
        prefix: 'menu',
        popupDelay: 300,
        menuActiveDuration: 120,
        hotkey: null
    };

    document.documentElement.classList.add(platform.os.family.toLowerCase().replace(/\W+/g, '-'));

    // Map of menu item properties assigned to 'data-*' properties
    var _aItemDataProperties = ['icon', 'align', 'placeholder', 'shortcut'];

    // Build appropriate shortcut map for the current platform
    var _oShortcutMap = {
        show: false,
        separator: '',
        order: 'scam',
        keys: {
            s: '',  // Shift
            c: '',  // Cntrl
            a: '',  // Alt
            m: ''   // Meta i.e. Windows or Command key
        }
    };
    switch (platform.os.family.toLowerCase()) {
        case 'windows':                         // Win 8
        case 'windows xp':
        case 'windows nt':                      // Win 10
        case 'windows server 2008 r2 / 7':      // Win 7
        case 'windows server 2008 r2 / 7 x64':  // Win 7
        case 'windows server 2008 / vista':     // Vista
            _oShortcutMap = {
                show: true,
                separator: '+',
                order: 'mcas',
                keys: {
                    s: 'Shift',
                    c: 'Ctrl',
                    a: 'Alt',
                    m: 'Win'
                }
            };
            break;
        case 'os x':
            _oShortcutMap = {
                show: true,
                separator: '',
                order: 'casm',
                keys: {
                    s: '⇧',
                    c: '⌃',
                    a: '⌥',
                    m: '⌘'
                }
            };
            break;
        case 'android:':
            break;
        case 'ios':
            break;
    }

    if (!sId) {
        console.error('Missing menu id');
        return;
    }
    _elRoot = document.getElementById(sId);
    if (!_elRoot) {
        console.error('Cannot find root menu with id ' + sId);
        return;
    }
    if (_elRoot.nodeName !== 'UL') {
        _elRoot = null;
        console.error('Root menu element must be a <ul>');
        return;
    }

    // Menu constructor looks valid so assign a unique ID to it
    _id = ++Menu.nextAvailableId;

    // Merge any given options with the defaults
    Utils.merge(_oOptions, oOptions);

    // Initialise live collections
    var _cSubMenus = _elRoot.getElementsByTagName('ul');
    var _cSubMenuItems = _elRoot.getElementsByTagName('li');

    // Install keyboard handler
    if (document.attachEvent) {
        // IE 8
        document.attachEvent('onkeydown', _keyDownHandler);
        //document.attachEvent('onkeyup', _keyUpHandler);
    } else {
        document.addEventListener('keydown', _keyDownHandler);
        //document.addEventListener('keyup', _keyUpHandler);
    }

    // Make sure any pre-declared menu structure has the correct properties
    _elRoot.classList.add(_oOptions.prefix + '-top');
    _elRoot.setAttribute('role', 'menubar');
    //if (_oOptions.tabindex) {
    //    _elRoot.setAttribute('tabindex', _oOptions.tabindex);
    //}
    _elRoot.style.zIndex += 50 - _id; // So menus higher up the page overlay ones further down

    // Set the appropriate classes on all menus
    for (var i = 0; i < _cSubMenus.length; ++i) {
        _cSubMenus[i].setAttribute('role', 'menu');
    }

    // Set the appropriate classes on all menu items
    for (var j = 0; j < _cSubMenuItems.length; ++j) {
        _decorateItem(_cSubMenuItems[j]);
    }

    // Make the entire menu structure visible
    _elRoot.style.display = 'block';

    // Handle focus
    //_elRoot.addEventListener('focus', function ()
    //{
    //    // Handle tabbing into a menu bar
    //    if (_iPressedKeyCode === 9) {
    //        _clearAllMenus();
    //        // Focus the menu bar
    //        _elRoot.classList.add(_oOptions.prefix + '-focus');
    //        // Select the first enabled top-level menu item
    //        for (var i = 0; i < _elRoot.children.length; i++) {
    //            var elTopLevelMenuItem = _elRoot.children[i];
    //            if (elTopLevelMenuItem.getAttribute('aria-disabled') !== 'true') {
    //                elTopLevelMenuItem.classList.add(_oOptions.prefix + '-active');
    //                _elCurrentActiveItem = elTopLevelMenuItem;
    //                break;
    //            }
    //        }
    //        _bJustGotFocus = true;
    //    }
    //});
    //
    //_elRoot.addEventListener('blur', function ()
    //{
    //    _clearAllMenus();
    //});

        // Wire up generic menu hover handler
    _elRoot.addEventListener('mouseover', function (e)
    {
        clearTimeout(_iOpenSubMenuTimer);
        if (e.target.getAttribute('aria-disabled') !== 'true' && e.target.getAttribute('role') !== 'separator') {
            if (_elRoot.classList.contains(_oOptions.prefix + '-focus') && e.target.nodeName === 'LI') {

                 _this.dispatchEvent('enter', e.target.id);
                _elCurrentActiveItem = e.target;

                // Clear currently active menu chain
                var _cActiveMenuItems = _elRoot.querySelectorAll('.' + _oOptions.prefix + '-active');
                for (var i = 0; i < _cActiveMenuItems.length; i++) {
                    _cActiveMenuItems[i].classList.remove(_oOptions.prefix + '-active');
                }

                // Work out which menu level we're on (and set classes to show the active menu chain)
                var iMenuLevel = 1;
                var elNode = e.target;
                while (elNode !== _elRoot) {
                    switch (elNode.nodeName) {
                        case 'UL':
                            ++iMenuLevel;
                            break;
                        case 'LI':
                            elNode.classList.add(_oOptions.prefix + '-active');
                            break;
                    }
                    elNode = elNode.parentNode;
                }

                // If this is a top-level menu open it immediately, else open it after a short delay
                if (!_oShortcutMap.show || e.target.parentNode === _elRoot || _oOptions.popupDelay === 0) {
                    _openSubMenu(e.target, iMenuLevel);
                } else {
                    _iOpenSubMenuTimer = setTimeout(function () {
                        _openSubMenu(e.target, iMenuLevel);
                    }, _oOptions.popupDelay);
                }
            }
        }
         e.stopPropagation();
    });

    _elRoot.addEventListener('mouseout', function (e)
    {
        if (_elRoot.classList.contains(_oOptions.prefix + '-focus') && e.target.nodeName === 'LI') {
            if (!e.target.children.length) {
                e.target.classList.remove(_oOptions.prefix + '-active');
            }
            if (e.target.getAttribute('aria-disabled') !== 'true' && e.target.getAttribute('role') !== 'separator') {
                _this.dispatchEvent('leave', e.target.id);
            }
        }
        e.stopPropagation();
    });

    _elRoot.addEventListener('touchstart', function (e) {
        e.stopPropagation();
        _bIgnoreClick = true;
        var elTouched = e.target;
        _oOptions.popupDelay = 0;

        // If the menu bar was touched clear all active menus
        if (elTouched === _elRoot) {
            _clearAllMenus();
            return;
        }

        // If a top-level menu item was touched clear all menu items first
        if (elTouched.parentNode === _elRoot) {
            _clearAllMenus();
        }

        // Ignore touches on disabled items
        var bDisabled = elTouched.getAttribute('aria-disabled') === 'true';
        if (!bDisabled) {
            var bHasSubMenu = !!elTouched.children.length;
            // Is this a top-level item?
            if (elTouched.parentNode === _elRoot) {
                _elRoot.classList.toggle(_oOptions.prefix + '-focus');
                elTouched.classList.toggle(_oOptions.prefix + '-active');
                if (elTouched.classList.contains(_oOptions.prefix + '-active')) {
                    // Top-level item is active
                    _clearAllMenus(_elRoot);
                    _elCurrentActiveItem = elTouched;
                    _this.dispatchEvent('enter', elTouched.id);
                    if (!bHasSubMenu) {
                        _this.dispatchEvent('click', elTouched.id);
                    }
                    _openSubMenu(e.target, 1);
                    if (!bHasSubMenu) {
                        setTimeout(function() {
                            _clearAllMenus();
                        }, _oOptions.menuActiveDuration);
                    }
                } else {
                    // Top-level item is inactive
                    if (!bHasSubMenu) {
                        _this.dispatchEvent('click', elTouched.id);
                    }
                    _clearAllMenus();
                }

            } else {
                // This is a sub-menu item
                if (elTouched.getAttribute('role') !== 'separator' && !bHasSubMenu) {
                    // Deal with a checkbox and radio button
                    var sRole = elTouched.getAttribute('role');
                    if (sRole === 'menuitemcheckbox') {
                        _toggleCheckbox(elTouched);
                    } else if (sRole === 'menuitemradio') {
                        _setRadio(elTouched);
                    }
                    // This is an action item i.e. no sub-menu
                    _this.dispatchEvent('click', elTouched.id);
                    _clearAllMenus();
                }
            }
        }
    });

    _elRoot.addEventListener('click', function (e)
    {
        e.stopPropagation();
        e.preventDefault();

        // Ignore click events if we've already detected a touch event
        if (_bIgnoreClick) {
            _bIgnoreClick = false;
            return;
        }

        var elClicked = e.target;

        // If the menu bar was clicked clear all active menus
        if (elClicked === _elRoot) {
            _clearAllMenus();
            return;
        }

        // Ignore clicks on disabled items
        var bDisabled = elClicked.getAttribute('aria-disabled') === 'true';
        if (!bDisabled) {
            var bHasSubMenu = !!elClicked.children.length;
            // Is this a top-level item?
            if (elClicked.parentNode === _elRoot) {
                if (_bJustGotFocus) {
                    _bJustGotFocus = false;
                } else {
                    _elRoot.classList.toggle(_oOptions.prefix + '-focus');
                    elClicked.classList.toggle(_oOptions.prefix + '-active');
                }
                if (elClicked.classList.contains(_oOptions.prefix + '-active')) {
                    // Top-level item is active
                    _clearAllMenus(_elRoot);
                    _elCurrentActiveItem = elClicked;
                    _this.dispatchEvent('enter', elClicked.id);
                    if (!bHasSubMenu) {
                        _this.dispatchEvent('click', elClicked.id);
                    }
                    _openSubMenu(e.target, 1);
                    if (!bHasSubMenu) {
                        setTimeout(function() {
                            _clearAllMenus();
                        }, _oOptions.menuActiveDuration);
                    }
                } else {
                    // Top-level item is inactive
                    if (!bHasSubMenu) {
                        _this.dispatchEvent('click', elClicked.id);
                    }
                    _clearAllMenus();
                }
            } else {
                // This is a sub-menu item
                if (elClicked.getAttribute('role') !== 'separator' && !bHasSubMenu) {
                    // Deal with a checkbox and radio button
                    var sRole = elClicked.getAttribute('role');
                    if (sRole === 'menuitemcheckbox') {
                        _toggleCheckbox(elClicked);
                    } else if (sRole === 'menuitemradio') {
                        _setRadio(elClicked);
                    }
                    // This is an action item i.e. no sub-menu
                    _this.dispatchEvent('click', elClicked.id);
                    _clearAllMenus();
                }
            }
        }

    });

    // Wire uo top-level handlers to deactivate all menus
    document.addEventListener('click', function () {
        // Ignore click events if we've already detected a touch event
        if (_bIgnoreClick) {
            _bIgnoreClick = false;
            return;
        }
        _clearAllMenus();
    });

    // Wire uo top-level handlers to deactivate all menus
    document.addEventListener('touchstart', function () {
        _bIgnoreClick = true;
        _clearAllMenus();
    });


    /**
     * PUBLIC METHODS
     */

    /**
     * Inserts one ot more menu items immediately after the menu item with the given ID.
     * @param sBaseMenuId string ID of the menu item to insert items after.
     * @param mNewItems array|object|string A set of new items to be inserted.
     */
    _this.insertAfter = function (sBaseMenuId, mNewItems)
    {
        var elBaseItem;
        var elTempSubMenuItem;
        if (sBaseMenuId) {
            // Fetch the base menu item element
            elBaseItem = document.getElementById(sBaseMenuId)
        } else {
            // No ID specified so we are going to insert into the top-level menu bar
            // If we already have items in it then insert after the last one
            if (_elRoot.children.length) {
                elBaseItem = _elRoot.children[_elRoot.children.length - 1];
            } else {
                // Menu bar is empty so create a temporary item to use as the base for the insert
                elTempSubMenuItem = document.createElement('li');
                _elRoot.appendChild(elTempSubMenuItem);
                elBaseItem = elTempSubMenuItem;
            }
        }
        if (elBaseItem) {
            _insert(elBaseItem, mNewItems);

            // If we created a temporary item we can remove it now
            if (elTempSubMenuItem) {
                _elRoot.removeChild(elTempSubMenuItem);
            }
        }

    };


    /**
     * Inserts one ot more menu items immediately before the menu item with the given ID.
     * @param sBaseMenuId string ID of the menu item to insert items before.
     * @param mNewItems array|object|string A set of new items to be inserted.
     */
    _this.insertBefore = function (sBaseMenuId, mNewItems)
    {
        var elBaseItem;
        var elTempSubMenuItem;

        if (sBaseMenuId) {
            // Fetch the base menu item element
            elBaseItem = document.getElementById(sBaseMenuId)
        } else {
            // No ID specified so we are going to insert into the top-level menu bar
            // If we already have items in it then insert after the last one
            if (_elRoot.children.length) {
                elBaseItem = _elRoot.children[0];
            } else {
                // Menu bar is empty so create a temporary item to use as the base for the insert
                elTempSubMenuItem = document.createElement('li');
                _elRoot.appendChild(elTempSubMenuItem);
                elBaseItem = elTempSubMenuItem;
            }
        }

        if (elBaseItem) {
            _insert(elBaseItem, mNewItems, 'BEFORE');

            // If we created a temporary item we can remove it now
            if (elTempSubMenuItem) {
                _elRoot.removeChild(elTempSubMenuItem);
            }
        }

    };


    /**
     * Appends one ot more items to the menu item with the given ID.
     * @param sBaseMenuId string ID of the menu item to append items to.
     * @param mNewItems array|object|string Set of additional items.
     */
    _this.append = function (sBaseMenuId, mNewItems)
    {
        var elBaseItem;
        if (sBaseMenuId) {
            // Fetch the base menu item element
            elBaseItem = document.getElementById(sBaseMenuId)
        }
        if (elBaseItem) {
            _insert(elBaseItem, mNewItems, 'APPEND');
        }
    };


    /**
     * Prepends one ot more items to the menu item with the given ID.
     * @param sBaseMenuId string ID of the menu item to prepend items to.
     * @param mNewItems array|object|string Set of additional items.
     */
    _this.prepend = function (sBaseMenuId, mNewItems)
    {
        var elBaseItem;
        if (sBaseMenuId) {
            // Fetch the base menu item element
            elBaseItem = document.getElementById(sBaseMenuId)
        }
        if (elBaseItem) {
            _insert(elBaseItem, mNewItems, 'PREPEND');
        }
    };


    /**
     * Replaces the given menu item's sub-menu with the given items.
     * @param sBaseMenuId string ID of the menu item whose items are to be replaced.
     * @param mNewItems array|object|string Set of new items.
     */
    _this.replace = function (sBaseMenuId, mNewItems)
    {
        _this.clear(sBaseMenuId);
        _this.append(sBaseMenuId, mNewItems);
    };


    /**
     * Removes the given menu item (and any children).
     * @param sMenuId string ID of the menu item to be removed.
     */
    _this.remove = function (sMenuId)
    {
        var elMenuItem = document.getElementById(sMenuId);
        if (elMenuItem) {
            elMenuItem.parentNode.removeChild(elMenuItem);
        }
    };


    /**
     * Sets attributes directly on the given menu item.
     * @param sMenuId string ID of the menu item whose properties are to be set.
     * @param oNewItems object Set of properties.
     */
    _this.set = function (sMenuId, oNewItems)
    {
        var elMenuItem = document.getElementById(sMenuId);
        if (elMenuItem && typeof oNewItems === 'object') {
            Object.keys(oNewItems).forEach(function (sKey) {
                switch (sKey) {
                    case 'text':
                        elMenuItem.textContent = oNewItems.text;
                        break;
                    case 'className':
                        // Append rather than set as the menu widget needs certain classes to work properly
                        elMenuItem.classList.add(oNewItems.className);
                        break;
                    case 'disabled':
                        if (oNewItems.disabled) {
                            elMenuItem.setAttribute('aria-disabled', 'true');
                        } else {
                            elMenuItem.removeAttribute('aria-disabled');
                        }
                        break;
                    case 'role':
                    case 'name':
                        elMenuItem.setAttribute(sKey, oNewItems[sKey]);
                        break;
                    case 'checked':
                        var sRole = elMenuItem.getAttribute('role');
                        if (oNewItems.checked) {
                            if (sRole === 'menuitemcheckbox') {
                                elMenuItem.setAttribute('aria-checked', 'true');
                            } else if (sRole === 'menuitemradio') {
                                _setRadio(elMenuItem);
                            }
                        } else {
                            elMenuItem.removeAttribute('aria-checked');
                        }
                        break;
                    case 'align':
                    case 'icon':
                    case 'placeholder':
                    case 'shortcut':
                        elMenuItem.setAttribute('data-' + sKey, oNewItems[sKey]);
                }
            });
            _decorateItem(elMenuItem);
        }
    };


    /**
     * Returns the current state of the given menu.
     * @param sMenuId string ID of the menu item to be inspected.
     * @return {{}} Object indicating the menu item's state
     */
    _this.get = function (sMenuId)
    {
        var elMenuItem = document.getElementById(sMenuId);
        if (!elMenuItem) {
            return {};
        }
        var oState = {
            align: elMenuItem.getAttribute('data-align') || 'left',
            className: elMenuItem.className,
            disabled: elMenuItem.getAttribute('aria-disabled') || false,
            icon: elMenuItem.getAttribute('data-icon') || null,
            id: sMenuId,
            menu: _id,
            placeholder: elMenuItem.getAttribute('data-placeholder') || null,
            shortcut: elMenuItem.getAttribute('data-shortcut') || null,
            role: elMenuItem.getAttribute('role') || null
        };

        // Add a checked property for a checkbox or radio button item
        if (oState.role === 'menuitemcheckbox' || oState.role === 'menuitemradio') {
            oState.checked = elMenuItem.getAttribute('aria-checked') || false;
        }

        // Add a name property for a radio button item
        if (oState.role === 'menuitemradio') {
            oState.name = elMenuItem.getAttribute('name') || null;
        }

        return oState;
    };


    /**
     * Returns the currently checked item in the given radio group, or null if the group doesn't exist or no element is checked.
     * @param sName Name of the radio group to inspect.
     * @return {string} ID of the checked menu item.
     */
    _this.getGroupChecked = function (sName)
    {
        var elChecked = _elRoot.querySelector('li[name="' + sName + '"][aria-checked="true"]');
        return elChecked ? elChecked.id : null;
    };


    /**
     * Empties an item's sub-menu and (optionally) removes the sub-menu entirely.
     * @param sMenuId string ID of the menu item to be cleared.
     * @param bRemoveList bool If true (default=false) removes the entire sub-menu (item becomes a clickable action)
     */
    _this.clear = function (sMenuId, bRemoveList)
    {
        if (sMenuId) {
            var elMenuItem = document.getElementById(sMenuId);
            if (elMenuItem && elMenuItem.children.length) {
                var elSubMenu = elMenuItem.children[0];
                if (bRemoveList) {
                    elMenuItem.removeChild(elSubMenu);
                } else {
                    while (elSubMenu.firstChild) {
                        elSubMenu.removeChild(elSubMenu.firstChild);
                    }
                    elSubMenu.appendChild(_createPlaceholderItem(elMenuItem.getAttribute('data-placeholder')));
                }
                _decorateItem(elMenuItem);
            }
        }
    };


    /**
     * Emulates the DOM addEventListener method (except that useCapture is not supported).
     * @param {string} sEventType Type (name) of the event to listen for.
     * @param {function} fnCallback Callback method to be invoked when the event is dispatched.
     */
    _this.addEventListener = function (sEventType, fnCallback)
    {
        _oListeners[sEventType] = _oListeners[sEventType] || [];
        if (_oListeners[sEventType].indexOf(fnCallback) === -1) {
            _oListeners[sEventType].push(fnCallback);
        }
        return fnCallback;
    };


    /**
     * Removes the given callback function from the list of listeners.
     * @param {string} sEventType Type (name) of the event to listen for.
     * @param {function} fnCallback Callback method to be removed.
     */
    _this.removeEventListener = function (sEventType, fnCallback)
    {
        if (typeof _oListeners[sEventType] !== 'undefined') {
            var iRemove = _oListeners[sEventType].indexOf(fnCallback);
            if (iRemove !== -1) {
                _oListeners[sEventType].splice(iRemove, 1)
            }
        }
    };


    /**
     * Dispatches the given custom event to all registered listeners.
     * @param {string} sEventType String identifying the event type (i.e name).
     * @param {object} [oEventArgs] Object describing any event arguments.
     */
    _this.dispatchEvent = function (sEventType, oEventArgs)
    {
        var oEvent;

        try {
            // Standards-based method
            //noinspection JSCheckFunctionSignatures
            oEvent = new CustomEvent(sEventType, {detail: oEventArgs} || {});
        }
        catch(e)  {
            // In IE 8+ (8 with polyfill) and Mobile Safari we need to dispatch the event differently
            oEvent = document.createEvent('CustomEvent');
            oEvent.initCustomEvent(sEventType, false, false, oEventArgs);
        }

        if (typeof _oListeners[oEvent.type] !== 'undefined') {
            for (var c = 0; c < _oListeners[oEvent.type].length; c++) {
                _oListeners[oEvent.type][c].call(this, oEvent);
            }
        }
    };


    /**
     * PRIVATE METHODS
     */

    function _insert(elBase, mNewItems, sPosition)
    {
        if (elBase) {
            mNewItems = Array.isArray(mNewItems) ? mNewItems : [mNewItems];

            // Reverse given array for a PREPEND
            if (sPosition === 'PREPEND') {
                mNewItems.reverse();
            }

            mNewItems.forEach(function (mNewItem) {

                var oNewItem = _normalise(mNewItem);

                // Create a new HTML list element
                var elNewItem = document.createElement('li');
                elNewItem.id = oNewItem.id || '';
                elNewItem.textContent = oNewItem.text || '';
                if (oNewItem.disabled) {
                    elNewItem.setAttribute('aria-disabled', 'true');
                }
                if (oNewItem.checked) {
                    elNewItem.setAttribute('aria-checked', 'true');
                }
                if (oNewItem.role) {
                    elNewItem.setAttribute('role', oNewItem.role);
                }
                _aItemDataProperties.forEach(function (sKey) {
                    if (oNewItem[sKey]) {
                        elNewItem.setAttribute('data-' + sKey, oNewItem[sKey]);
                    }
                });

                // Add the element to the appropriate place in the DOM
                var i;
                var elCreateSubMenu;
                var aCurrentPlaceholders;
                sPosition = sPosition || 'AFTER';
                switch (sPosition) {

                    case 'APPEND':
                        if (elBase.children.length === 0) {
                            // The given item has no sub-items so we need to create a sub menu first
                            elCreateSubMenu = document.createElement('ul');
                            elCreateSubMenu.setAttribute('role', 'menu');
                            elBase.appendChild(elCreateSubMenu);
                        } else {
                            // Remove any existing list placeholder if this is a flyout menu
                            if (_getMenuLevel(elBase) > 2) {
                                aCurrentPlaceholders = elBase.children[0].querySelectorAll('.' + _oOptions.prefix + '-placeholder');
                                for (i = 0; i < aCurrentPlaceholders.length; i++) {
                                    elBase.children[0].removeChild(aCurrentPlaceholders[i]);
                                }
                            }
                        }
                        elBase.children[0].appendChild(elNewItem);
                        break;

                    case 'PREPEND':
                        if (elBase.children.length === 0) {
                            // The given item has no sub-items so we need to create a sub menu first
                            elCreateSubMenu = document.createElement('ul');
                            elCreateSubMenu.setAttribute('role', 'menu');
                            elBase.appendChild(elCreateSubMenu);
                        } else {
                            // Remove any existing list placeholder if this is a flyout menu
                            if (_getMenuLevel(elBase) > 2) {
                                aCurrentPlaceholders = elBase.children[0].querySelectorAll('.' + _oOptions.prefix + '-placeholder');
                                for (i = 0; i < aCurrentPlaceholders.length; i++) {
                                    elBase.children[0].removeChild(aCurrentPlaceholders[i]);
                                }
                            }
                        }
                        elBase.children[0].insertBefore(elNewItem, elBase.children[0].firstChild);
                        break;

                    case 'BEFORE':
                        elBase.parentNode.insertBefore(elNewItem, elBase);
                        break;

                    case 'AFTER':
                        elBase.parentNode.insertBefore(elNewItem, elBase.nextSibling);
                        elBase = elNewItem;
                        break;
                }

                if (oNewItem.items) {
                    // We have sub-items to add so create a list to contain them
                    var elNewSubMenu = document.createElement('ul');
                    elNewSubMenu.setAttribute('role', 'menu');

                    // For flyout menus add a temporary sub-item as the base for the insert (and also to act as a placeholder for an empty list)
                    var elTempSubMenuItem = _createPlaceholderItem(oNewItem.placeholder);
                    elNewSubMenu.appendChild(elTempSubMenuItem);
                    elNewItem.appendChild(elNewSubMenu);

                    // Insert the requested items
                    _insert(elTempSubMenuItem, oNewItem.items, 'AFTER');

                    // If this not a flyout (or we have more than one item in the list) remove the placeholder node
                    if (_getMenuLevel(elTempSubMenuItem) < 3 || elNewSubMenu.children.length > 1) {
                        elNewSubMenu.removeChild(elTempSubMenuItem);
                    }
                }

                // Add HTML classes appropriate to the new element
                _decorateItem(elNewItem);

                // Add any custom classes
                if (oNewItem.className) {
                    elNewItem.classList.add(oNewItem.className);
                }

            });
        }
    }


    function _normalise(mNewItem)
    {
        if (!mNewItem) {
            return { text: '' };
        }
        if (typeof mNewItem === 'string') {
            return { text: mNewItem } ;
        }
        if (typeof mNewItem === 'object') {
            return mNewItem;
        }
    }


    /**
     * Analyses the data attributes associated with the given menu item element and adds the appropriate styling classes.
     * @param elSubMenuItem
     * @private
     */
    function _decorateItem(elSubMenuItem)
    {
        // Clear any existing classes
        elSubMenuItem.className = '';

        // If this is an empty list item then make it a separator
        if (!elSubMenuItem.textContent) {
            elSubMenuItem.setAttribute('role', 'separator');
            _bCreateNextMenuGroup = true;
        } else {

            // Assign a default ARIA role if none has been provided
            var sRole = elSubMenuItem.getAttribute('role');
            if (!sRole) {
                elSubMenuItem.setAttribute('role', 'menuitem');
                sRole = 'menuitem';
            }

            // If the menu item has no ID then create one from the menu text
            if (!elSubMenuItem.id) {
                var sNodeText = elSubMenuItem.firstChild.textContent;
                sNodeText = sNodeText || '';
                elSubMenuItem.id = _generateId(sNodeText.trim());
            }

            // If this is not a top-level item...
            if (elSubMenuItem.parentNode !== _elRoot) {
                // If it has a child list then it's a sub-menu so add the correct class
                if (elSubMenuItem.children.length) {
                    elSubMenuItem.classList.add(_oOptions.prefix + '-' + 'submenu');
                    // If there are no items in the sub-menu yet add a placeholder
                    if (!elSubMenuItem.children[0].children.length) {
                        elSubMenuItem.children[0].appendChild(_createPlaceholderItem(elSubMenuItem.getAttribute('data-placeholder')));
                    }
                }
            }

            // Generate a name for radio button groups if we don't yet have one
            if (sRole === 'menuitemradio' && !elSubMenuItem.hasAttribute('name')) {
                if (_bCreateNextMenuGroup) {
                    ++Menu.nextAvailableRadioGroupId;
                    _bCreateNextMenuGroup = false;
                }
                elSubMenuItem.setAttribute('name', _oOptions.prefix + '-group-' + Menu.nextAvailableRadioGroupId);
            }

            // Handle icons
            if (elSubMenuItem.getAttribute('data-icon')) {
                elSubMenuItem.classList.add(_oOptions.prefix + '-icon');
                var aMatches = elSubMenuItem.getAttribute('data-icon').match(/^(.*?)\((.*?)\)$/);
                if (aMatches && aMatches.length === 3) {
                    switch (aMatches[1]) {
                        case 'class':
                            elSubMenuItem.classList.add(aMatches[2]);
                            break;
                        case 'url':
                            // Not yet implemented
                            break;
                    }
                } else {
                    // Not yet implemented
                }
            }

            // Handle right-aligned items
            if (elSubMenuItem.getAttribute('data-align')) {
                elSubMenuItem.classList.add(_oOptions.prefix + '-align-right');
            }

            // The data-shortcut attribute will be displayed in the menu
            if (elSubMenuItem.getAttribute('data-shortcut')) {
                 if (_oShortcutMap.show) {

                    // Convert any keyboard shortcut into the symbols appropriate to this platform
                    var aShortcutDefinition = elSubMenuItem.getAttribute('data-shortcut').toLowerCase().split(/\W+/);

                    // Last element is the actual key
                    var sKey = aShortcutDefinition[aShortcutDefinition.length - 1];
                    var iKeyCode = _getKeycode(sKey);
                    var oDuplicateShortcut;

                    // Create a new candidate shortcut
                    var oNewShortcut = {
                        menu: _id,
                        id: elSubMenuItem.id,
                        key: iKeyCode,
                        modifiers: { c: false, a: false, s: false, m: false }
                    };

                    // Set any required modifiers
                     for (var i = 0; i < aShortcutDefinition.length - 1; i++) {
                        // Only the first letter of a modifier is significant
                        var sMapKey = aShortcutDefinition[i].charAt(0);
                        if (typeof oNewShortcut.modifiers[sMapKey] !== 'undefined') {
                            oNewShortcut.modifiers[sMapKey] = true;
                        }
                    }

                    // Check for duplicate shortcut
                    if (oDuplicateShortcut = Menu.shortcuts.find(_duplicateShortcut, oNewShortcut)) {
                        console.warn('Ignored attempt to reassign shortcut', elSubMenuItem.getAttribute('data-shortcut'), 'to', elSubMenuItem.id, '- already assigned to', oDuplicateShortcut.id);
                    } else {
                        Menu.shortcuts.push(oNewShortcut);

                        // Format shortcut for display
                        var aDisplayOrder = _oShortcutMap.order.split('');
                        var aDisplayShortcut = [];
                        Object.keys(oNewShortcut.modifiers).forEach(function (sModifier) {
                            if (oNewShortcut.modifiers[sModifier]) {
                                aDisplayShortcut[aDisplayOrder.indexOf(sModifier)] = _oShortcutMap.keys[sModifier];
                            }
                        });
                        aDisplayShortcut.push(sKey.toUpperCase());
                        elSubMenuItem.setAttribute('data-shortcut-display', aDisplayShortcut.filter(function (el) { return el; }).join(_oShortcutMap.separator));
                    }
                } else {
                    elSubMenuItem.setAttribute('data-shortcut-display',  '');
                }

            }

        }

        /**
         * Returns true if the passed in shortcut matches the new candidate shortcut.
         * @param oShortcut
         * @return {boolean}
         * @private
         */
        function _duplicateShortcut(oShortcut)
        {
            return oShortcut.id !== this.id && oShortcut.key === this.key && Utils.areEqual(oShortcut.modifiers, this.modifiers);
        }

    }


    _generateId.iNextId = 0;
    function _generateId(sValue)
    {
        return _oOptions.prefix + (_id > 1 ? _id : '') + '-item-' + (sValue ? sValue.replace(/[^\w\s]/g, '').replace(/\s+/g, '-').toLowerCase() : ++_generateId.iNextId);
    }


    function _openSubMenu(elParentMenu, iLevel, bActivate)
    {
        // Close all other menus at this and higher levels
        for (var iCloseLevel = iLevel; iCloseLevel < 5; ++iCloseLevel) {
            var lOpenMenus = document.querySelectorAll('.' + _oOptions.prefix + '-open-' + iCloseLevel);
            for (var i = 0; i < lOpenMenus.length; ++i) {
                lOpenMenus[i].classList.remove(_oOptions.prefix + '-open-' + iCloseLevel);
            }
        }

        // Open the sub menu related to this top-level menu item if it's enabled
        if (elParentMenu.children.length) {
            elParentMenu.children[0].classList.add(_oOptions.prefix + '-open-' + iLevel);
            _this.dispatchEvent('opened', elParentMenu.id);

            // If required activate the first applicable item
            if (bActivate) {
                var elNextItem = elParentMenu.children[0].children[0];
                // Skip separators and disabled items
                while (elNextItem && (elNextItem.getAttribute('role') === 'separator' || elNextItem.getAttribute('aria-disabled') === 'true')) {
                    elNextItem = elNextItem.nextElementSibling;
                }
                if (elNextItem) {
                    elNextItem.classList.add(_oOptions.prefix + '-active');
                    _this.dispatchEvent('enter', elNextItem.id);
                    _elCurrentActiveItem = elNextItem;
                }
            }
        }
    }


    /**
     * Deactivates the given menu and any child menus.
     * @param elMenu
     * @private
     */
    function _deactivateMenu(elMenu)
    {
        elMenu.classList.remove(_oOptions.prefix + '-active');
        var cActiveElements = elMenu.querySelectorAll('.' + _oOptions.prefix + '-active');
        for (var i = 0; i < cActiveElements.length; i++) {
            cActiveElements[i].classList.remove(_oOptions.prefix + '-active');
        }
    }


    // Set the width of sub-menus
    _this.addEventListener('opened', function(e) {
        var elMenuItem = document.getElementById(e.detail);
        // Does this menu item contain a sub-menu?
        if (elMenuItem && elMenuItem.nodeName === 'LI' && elMenuItem.children.length) {
            var bIsRightAligned = false;
            var elSearch = elMenuItem;
            while (elSearch) {
                if (elSearch.nodeName === 'LI' && elSearch.getAttribute('data-align') === 'right') {
                    bIsRightAligned = true;
                    break;
                }
                elSearch = elSearch.parentNode;
            }
            if (_getMenuLevel(elMenuItem) > 2) {
                elMenuItem.children[0].style.left = (bIsRightAligned ? '-' + (elMenuItem.children[0].clientWidth - 4) : elMenuItem.clientWidth - 4) + 'px';
            }
        }
    });


    /**
     * Creates a menu placeholder item.
     * @param [sPlaceholderText] Placeholder text.
     * @return {Element} HTML list element.
     * @private
     */
    function _createPlaceholderItem(sPlaceholderText)
    {
        var elPlaceholder = document.createElement('li');
        elPlaceholder.className = _oOptions.prefix + '-placeholder';
        elPlaceholder.textContent = sPlaceholderText || 'No items';
        elPlaceholder.setAttribute('aria-disabled', 'true');
        return elPlaceholder;
    }


    /**
     * Calculates the hierarchy level of the given menu item (1 = top-level)
     * @private
     */
    function _getMenuLevel(elMenuItem)
    {
        var iLevel = 1;
        while (elMenuItem.parentNode && elMenuItem.parentNode !== _elRoot) {
            elMenuItem = elMenuItem.parentNode;
            ++iLevel;
        }
        return iLevel;
    }


    /**
     * Resets all menus on the current page.
     * @param {Element} [elExclude] Root menu element to exclude from the clear.
     * @private
     */
    function _clearAllMenus(elExclude)
    {
        elExclude = elExclude || null;

        // Work out which menus to clear
        var i;
        var _cFocusedMenuItems = document.querySelectorAll('.' + _oOptions.prefix + '-focus');
        for (i = 0; i < _cFocusedMenuItems.length; i++) {
            var elMenuItem = _cFocusedMenuItems[i];
            if (!elExclude || elExclude !== elMenuItem) {
                var cActiveItems = elMenuItem.querySelectorAll('.' + _oOptions.prefix + '-active');
                for (i = 0; i < cActiveItems.length; i++) {
                    cActiveItems[i].classList.remove(_oOptions.prefix + '-active');
                }
                var cOpenMenus = elMenuItem.querySelectorAll('.' + _oOptions.prefix + '-open-1');
                for (i = 0; i < cOpenMenus.length; i++) {
                    cOpenMenus[i].classList.remove(_oOptions.prefix + '-open-1');
                }
                elMenuItem.classList.remove(_oOptions.prefix + '-focus');
            }
        }

        // Trigger a leave event if required
        if (_elCurrentActiveItem && elExclude !== _elCurrentActiveItem) {
            _this.dispatchEvent('leave', _elCurrentActiveItem.id);
        }

        _elCurrentActiveItem = elExclude;
    }


    /**
     * Implements keyboard handling for this menu.
     * @param {KeyboardEvent} e
     * @private
     */
    function _keyDownHandler(e)
    {
        var sRole;
        var iKeyCode = e.keyCode || e.which;
        var i;
        _iPressedKeyCode = iKeyCode;
        if (typeof e.metaKey === 'undefined') { // This can be undefined on IE 8
            e.metaKey = false;
        }

        // Deal with any menu keyboard shortcuts
        var oShortcut;
        if (oShortcut = Menu.shortcuts.find(_findShortcut, { menu: _id, key: iKeyCode, modifiers: { c: e.ctrlKey, a: e.altKey, s: e.shiftKey, m: e.metaKey } })) {
            var elMenuItem = document.getElementById(oShortcut.id);
            // Ignore shortcuts on disabled items, or items with sub-menus
            if (elMenuItem && elMenuItem.getAttribute('aria-disabled') !== 'true' && elMenuItem.children.length === 0) {
                // Deal with a menuitemcheckbox
                sRole = elMenuItem.getAttribute('role');
                if (sRole === 'menuitemcheckbox') {
                    _toggleCheckbox(elMenuItem);
                } else if (sRole === 'menuitemradio') {
                    _setRadio(elMenuItem);
                }
                elMenuItem.classList.add(_oOptions.prefix + '-active');
                _this.dispatchEvent('click', elMenuItem.id);
                setTimeout(function() { elMenuItem.classList.remove(_oOptions.prefix + '-active'); }, _oOptions.menuActiveDuration);
                e.stopPropagation();
                e.preventDefault();
            }
        }

        // Look for this menu's activation hotkey
        if (_oOptions.hotkey && _oOptions.hotkey.modifiers && iKeyCode === _oOptions.hotkey.keycode && e.altKey === _oOptions.hotkey.modifiers.a && e.shiftKey === _oOptions.hotkey.modifiers.s && e.ctrlKey  === _oOptions.hotkey.modifiers.c && e.metaKey === _oOptions.hotkey.modifiers.m) {
            // Clear currently active menu chain
            var _cActiveMenuItems = document.querySelectorAll('.' + _oOptions.prefix + '-active');
            for (i = 0; i < _cActiveMenuItems.length; i++) {
                _cActiveMenuItems[i].classList.remove(_oOptions.prefix + '-active');
            }

            if (_elCurrentActiveItem) {
                 _clearAllMenus();
             } else {
                 if (_elRoot.children) {
                     _elRoot.classList.add(_oOptions.prefix + '-focus');
                     // Select the first enabled top-level menu item
                     for (i = 0; i < _elRoot.children.length; i++) {
                         var elTopLevelMenuItem = _elRoot.children[i];
                         if (elTopLevelMenuItem.getAttribute('aria-disabled') !== 'true') {
                             elTopLevelMenuItem.classList.add(_oOptions.prefix + '-active');
                             _openSubMenu(elTopLevelMenuItem, 1);
                             _elCurrentActiveItem = elTopLevelMenuItem;
                             break;
                         }
                     }

                     _openSubMenu(_elRoot.children[0], 1);
                     _elCurrentActiveItem = _elRoot.children[0];
                 }
             }
             e.stopPropagation();
             e.preventDefault();
        }

        // Ignore menu navigation keystrokes if we don't have focus
        if (_elRoot.classList.contains(_oOptions.prefix + '-focus')) {
            switch (iKeyCode) {
                case 13: // Enter
                case 32: // Space
                case 33: // Page-up
                case 34: // Page-down
                case 37: // Left-arrow
                case 38: // Up-arrow
                case 39: // Right-arrow
                case 40: // Down-arrow
                    _kbNavigateMenu(iKeyCode);
                    e.stopPropagation();
                    e.preventDefault();
                    break;
                case 27: // Escape key
                    _clearAllMenus();
                    e.stopPropagation();
                    e.preventDefault();
                    break;
            }
        }
    }


    /**
     * Implements keyboard handling for this menu.
     * @private
     */
    //function _keyUpHandler()
    //{
    //    _iPressedKeyCode = 0;
    //}

        /**
     * Returns true of the shortcut in 'this' matches the given shortcut. Used as an array filter function.
     * @param oShortcut Shortcut to test.
     * @return {boolean|*}
     * @private
     */
    function _findShortcut(oShortcut)
    {
        return oShortcut.menu === this.menu && oShortcut.key === this.key && Utils.areEqual(oShortcut.modifiers, this.modifiers);
    }


    /**
     * Implements keyboard navigation of a menu hierarchy.
     * @param iKeyCode {Number} Key code of pressed key.
     * @private
     */
    function _kbNavigateMenu(iKeyCode)
    {
        var elNextItem;
        var iLooped = 0;
        var aTopLevelItems;
        var iItemIndex;
        var elMenu;
        var elActiveTopMenu = _elRoot.querySelector('ul.menu-top.menu-focus > li.' + _oOptions.prefix + '-active');
        if (!elActiveTopMenu) {
            return;
        }

        // Invert right-left arrow keys for sub-menus that are inside a right-aligned top menu
        var bInvertLeftRight = _elCurrentActiveItem.parentNode !== _elRoot && elActiveTopMenu.getAttribute('data-align') === 'right';
        if (bInvertLeftRight) {
            if (iKeyCode == 37) iKeyCode = 39;
            else if (iKeyCode == 39) iKeyCode = 37;
        }

        switch(iKeyCode) {
            case 13: // Enter
            case 32: // Space
                if (_elCurrentActiveItem) {
                    // Handle action items
                    if (_elCurrentActiveItem.children.length === 0) {
                        // Deal with a checkbox menu item
                        var sRole = _elCurrentActiveItem.getAttribute('role');
                        if (sRole === 'menuitemcheckbox') {
                            _toggleCheckbox(_elCurrentActiveItem);
                        } else if (sRole === 'menuitemradio') {
                            _setRadio(_elCurrentActiveItem);
                        }
                        _this.dispatchEvent('click', _elCurrentActiveItem.id);
                        _clearAllMenus();
                    } else {
                        // Handle sub-menu items
                        _openSubMenu(_elCurrentActiveItem, _getLevel(_elCurrentActiveItem), true);
                    }
                }
                break;

            case 37: // Left-arrow
                // If the currently active item is part of a flyout menu (level > 2) item then close it.
                if (_getLevel(_elCurrentActiveItem) > 2) {
                    _elCurrentActiveItem.parentNode.className = '';
                    _deactivateMenu(_elCurrentActiveItem);
                    _elCurrentActiveItem = _elCurrentActiveItem.parentNode.parentNode;
                } else {
                    aTopLevelItems = _sortTopLevelItems();
                    elNextItem = elActiveTopMenu;
                    iItemIndex = aTopLevelItems.indexOf(elActiveTopMenu);
                    do {
                        if (bInvertLeftRight) {
                            // Wrap if we've reached the end of the list
                            if (++iItemIndex >= aTopLevelItems.length) {
                                iItemIndex = 0;
                                ++iLooped;
                            }
                        } else {
                            // Wrap if we've reached the start of the list
                            if (--iItemIndex < 0) {
                                iItemIndex = aTopLevelItems.length - 1;
                                ++iLooped;
                            }
                        }
                        elNextItem = aTopLevelItems[iItemIndex];
                    } while (elNextItem.getAttribute('aria-disabled') === 'true' && iLooped < 3);
                    if (elActiveTopMenu !== elNextItem) {
                        _deactivateMenu(elActiveTopMenu);
                        elNextItem.classList.add(_oOptions.prefix + '-active');
                        _this.dispatchEvent('enter', elNextItem.id);
                        _openSubMenu(elNextItem, 1);
                        _elCurrentActiveItem = elNextItem;
                    }
                }
                break;

            case 39: // Right-arrow
                // If the currently active item isn't a top-level item and contains a sub-menu then open and activate it
                if (_elCurrentActiveItem.parentNode !== _elRoot && _elCurrentActiveItem.children.length) {
                    _openSubMenu(_elCurrentActiveItem, _getLevel(_elCurrentActiveItem), true);
                } else {
                    aTopLevelItems = _sortTopLevelItems();
                    elNextItem = elActiveTopMenu;
                    iItemIndex = aTopLevelItems.indexOf(elActiveTopMenu);
                    do {
                        if (bInvertLeftRight) {
                            // Wrap if we've reached the start of the list
                            if (--iItemIndex < 0) {
                                iItemIndex = aTopLevelItems.length - 1;
                                ++iLooped;
                            }
                        } else {
                            // Wrap if we've reached the end of the list
                            if (++iItemIndex >= aTopLevelItems.length) {
                                iItemIndex = 0;
                                ++iLooped;
                            }
                        }
                        elNextItem = aTopLevelItems[iItemIndex];
                    } while (elNextItem.getAttribute('aria-disabled') === 'true' && iLooped < 3);
                    if (elActiveTopMenu !== elNextItem) {
                        _deactivateMenu(elActiveTopMenu);
                        elNextItem.classList.add(_oOptions.prefix + '-active');
                        _this.dispatchEvent('enter', elNextItem.id);
                        _openSubMenu(elNextItem, 1);
                        _elCurrentActiveItem = elNextItem;
                    }
                }
                break;

            case 38: // Up-arrow
                // If the currently active menu is a top-level menu then start with its last sub-menu item
                if (_elCurrentActiveItem.parentNode === _elRoot && elActiveTopMenu.children.length) {
                    elNextItem = elActiveTopMenu.children[0].children[elActiveTopMenu.children[0].children.length - 1];
                } else {
                    elNextItem = _elCurrentActiveItem.previousElementSibling;
                }
                _activateValidItem(true);
                break;

            case 40: // Down-arrow
                // If the currently active menu is a top-level menu then open and activate its first enabled sub-menu item
                if (_elCurrentActiveItem.parentNode === _elRoot && elActiveTopMenu.children.length) {
                    if (_elCurrentActiveItem.children.length && !_elCurrentActiveItem.children[0].classList.contains(_oOptions.prefix + '-open-1')) {
                        _openSubMenu(_elCurrentActiveItem, 1);
                    }
                    elNextItem = elActiveTopMenu.children[0].children[0];
                } else {
                    elNextItem = _elCurrentActiveItem.nextElementSibling;
                }
                _activateValidItem();
                break;

            case 33: // Page-up
                // Activate the first sub-menu item in the current menu (or parent menu if we're a top-level item)
                elMenu = _elCurrentActiveItem.parentNode === _elRoot ? _elCurrentActiveItem.children[0] : _elCurrentActiveItem.parentNode;
                if (elMenu) {
                    elNextItem = elMenu.children[0];
                    _activateValidItem();
                }
                break;

            case 34: // Page-down
                // Activate the last sub-menu item in the current menu (or parent menu if we're a top-level item)
                elMenu = _elCurrentActiveItem.parentNode === _elRoot ? _elCurrentActiveItem.children[0] : _elCurrentActiveItem.parentNode;
                if (elMenu) {
                    elNextItem = elMenu.children[elMenu.children.length - 1];
                    _activateValidItem(true);
                }
                break;

        }

        function _activateValidItem(bBackwards)
        {
            // Skip separators and disabled items
            while (elNextItem && (elNextItem.getAttribute('role') === 'separator' || elNextItem.getAttribute('aria-disabled') === 'true')) {
                elNextItem = bBackwards ? elNextItem.previousElementSibling : elNextItem.nextElementSibling;
            }

            // If the suggested item is different to the current one then activate it
            if (elNextItem && elNextItem !== _elCurrentActiveItem) {
                // Don't deactivate the top-level menu item while navigating within it
                if (_elCurrentActiveItem.parentNode !== _elRoot) {
                    _elCurrentActiveItem.classList.remove(_oOptions.prefix + '-active');
                }
                elNextItem.classList.add(_oOptions.prefix + '-active');
                _this.dispatchEvent('enter', elNextItem.id);
                _elCurrentActiveItem = elNextItem;
            }
        }

    }


    /**
     * Creates an array of top-level child menus sorted by visual order on the page (to accommodate right-aligned items)
     * @return {Array} Sorted menu items.
     * @private
     */
    function _sortTopLevelItems()
    {
        var aTopLevelItems = [];
        for (var i = 0, iMax = _elRoot.children.length; i < iMax; i++) {
            var elChild = _elRoot.children[i];
            aTopLevelItems.push(elChild);
        }
        aTopLevelItems.sort(function(a, b) {
            return a.offsetLeft - b.offsetLeft;
        });
        return aTopLevelItems;
    }


    function _getKeycode(sKey)
    {
        if (!sKey) {
            return 0;
        }

        // Single characters
        if (sKey.length == 1) {
            return sKey.toUpperCase().charCodeAt(0);
        }

        // Function keys
        var aMatches;
        if (aMatches = /^f(\d+)$/.exec(sKey)) {
            return 111 + Number(aMatches[1]);
        }
    }


    function _getLevel(elMenuItem)
    {
        var iMenuLevel = 1;
        while (elMenuItem !== _elRoot) {
            if (elMenuItem.nodeName === 'UL') {
                ++iMenuLevel;
            }
            elMenuItem = elMenuItem.parentNode;
        }
        return iMenuLevel;
    }


    function _toggleCheckbox(elItem)
    {
        if (elItem.getAttribute('aria-checked') === 'true') {
            elItem.removeAttribute('aria-checked');
        } else {
            elItem.setAttribute('aria-checked', 'true');
        }
    }


    function _setRadio(elItem)
    {
        // Uncheck the current selection
        var cGroupMembers = elItem.parentNode.querySelectorAll('li[name="' + elItem.getAttribute('name') + '"][aria-checked="true"]');
        for (var i = 0; i < cGroupMembers.length; i++) {
            cGroupMembers[i].removeAttribute('aria-checked');
        }
        elItem.setAttribute('aria-checked', 'true');
    }

}
