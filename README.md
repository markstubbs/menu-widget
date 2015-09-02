## About

This widget aims to emulate a 'real' desktop menu control as much as possible.
Highlights include:

* Supports both fixed menus defined via HTML and dynamic items modified via a JavaScript API.
* Supports up to 4 levels of hierarchical menus.
* Supports right-aligned menus.
* Includes [WAI-ARIA](http://www.w3.org/TR/wai-aria/) compliant roles.
* Full keyboard support, including menu activation hotkeys, navigation and global keyboard shortcuts.
* Platform-aware styling for OS X and Windows (including Windows 10).
* Does **not** rely on CSS hover. Menus will not appear until the user clicks on the widget and don't disappear if you accidentally mouse out of an open menu hierarchy.
* Works with IE8+, Chrome, Firefox and Safari.
* Compatible with touch devices.
* Self contained; no framework dependencies (IE8 support needs jQuery 1.3/1.4).

#### Online Demo
See it in action at [Menu Demo](http://menu.markstubbs.info/)

## Getting Started

#### Installation

##### CSS

```html
<link rel="stylesheet" type="text/css" href="/css/menu.min.css">
```

##### JavaScript

```html
<script src="/script/polyfills/Array.find.min.js"></script>
<script src="/script/utils.min.js"></script>
<script src="/script/platform.min.js"></script>
<script src="/script/menu.min.js"></script>
```

###### IE 9+ Support
Tto support IE9+ you'll also need to prepend some additional polyfills:

```html
<script src="/script/polyfills/console.min.js"></script>
<script src="/script/polyfills/classlist.min.js"></script>
```

###### IE 8+ Support
To support IE8+ you'll need to prepend a few more:

```html
<script src="/script/polyfills/console.min.js"></script>
<script src="/script/polyfills/ie8.min.js"></script>
<script src="/script/polyfills/trim.min.js"></script>
<script src="/script/polyfills/Object.keys.min.js"></script>
<script src="/script/polyfills/Array.filter.min.js"></script>
<script src="/script/polyfills/Array.indexOf.min.js"></script>
<script src="/script/polyfills/Array.isArray.min.js"></script>
<script src="/script/polyfills/Array.forEach.min.js"></script>
<script src="/script/polyfills/classlist.min.js"></script>
<script src="/script/jquery-1.11.3.min.js"></script>
<script src="/script/polyfills/selectivizr.min.js"></script>
```

#### Creating Your First Static Menu

The easiest way to create a static menu is to create a set of nested unordered lists.
Here's an example that illustrates a number of features:
```html
<ul id="menu" style="display: none">
    <li>
        menu1
        <ul>
            <li data-icon="class(fa-file-o)" data-shortcut="m a">action 1</li>
            <li aria-disabled="true">action 2 (disabled)</li>
            <li></li>
            <li role="menuitemcheckbox">checkbox 1</li>
            <li role="menuitemcheckbox" aria-checked="true">checkbox 2</li>
            <li></li>
            <li role="menuitemradio" aria-checked="true">radio button 1</li>
            <li role="menuitemradio">radio button 2</li>
            <li role="menuitemradio">radio button 3</li>
        </ul>
    </li>
    <li>
        menu2
        <ul>
            <li>action 3</li>
            <li>
                submenu 1
                <ul>
                    <li>action 5</li>
                    <li>
                        submenu 2
                        <ul>
                            <li>
                                submenu 3
                                <ul>
                                    <li>action 7</li>
                                </ul>
                            </li>
                            <li>action 6</li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li>action 4</li>
        </ul>
    </li>
    <li data-align="right">
        help
        <ul>
            <li>help topic 1</li>
            <li>help topic 2</li>
            <li></li>
            <li>about</li>
        </ul>
    </li>
</ul>
```

To render the menu create a new Menu object in JavaScript passing the ID of the top-level `<ul>` like this:
```javascript
var menu = new Menu('menu');
```

which will appear like this using the default stylesheet (on a Mac):

![Menu sample 1](./screenshots/menu1.png)
![Menu sample 2](./screenshots/menu2.png)

The top-level menubar is defined as a `<ul>` with a unique ID and a `display: none` style to prevent a [FOUC](https://en.wikipedia.org/wiki/Flash_of_unstyled_content).
Menu action items are defined by adding `<li>`s to the list.
Sub-menus are created by simply nesting `<ul>`s inside `<li>`s as shown in the example.

Menu item properties are specified using a combination of ARIA roles and HTML `data-*` attributes on the `<li>` tag.
See the Reference section below for details.

Notes about the example:
* Action 1 has a `data-icon` that specifies a class to be added to its `:before` pseudo-element.
In the examples here and in the online demo these classes are used to apply Font-Awesome styles to create icons.
* Action 1 also has a `data-shortcut` attribute to specify a global keyboard shortcut - in this case Win+A (Windows) or Cmd+A (Mac).
Shortcuts will be displayed according to the conventions of the target OS.
* Action 2 has been disabled by specifying an `aria-disabled="true"` attribute.
* Separators are implicitly declared by creating an empty `<li>`.
* Checkboxes are created by adding an ARIA attribute `role="menuitemcheckbox"`.
* Radio button groups are created by adding an ARIA attribute `role="menuitemradio"`.
* The Help menu has been right-aligned using a `data-align="right"` attribute.
* You can specify IDs for each item widget in the HTML, but if you omit them (as in the example above) the widget will automatically generate them from the menu item's text.
* Radio button groups can be identified by adding a `name` attribute to each member of the group in the usual way, but if you omit them the widget will automatically create them.

#### Menu events

The widget generates a number of events that you can listen for in order to react to user input.  The most important of these is the `select` event.
This is generated by clicking or touching an item, hitting the space or enter key when an item is highlighted, or when a menu keyboard shortcut is detected.

The following code snippet will display the ID of the selected item (assuming that the `menu` variable already contains a valid Menu instance):

```javascript
menu.addEventListener('select', function (e) {
	alert('Menu item with ID ' + e.detail +' was selected');
});
```

All events triggered by the widget include the ID of the selected item in the `detail` property of the event object passed to the handler.

*Disabled items and items containing sub-menus never generate `select` events.*

See the Reference section below for more details.

## Reference

##### Constructor Options

The following options are supported when instantiating a new Menu object:

| Option | Default | Description
| ------ | ------- | -----------
| `defaultPlaceholder` | `No items`  | Placeholder text used when a sub-menu contains no items.
| `hotkey` | `null`  | A global hotkey combination that will immediately focus and activate the menu. Modifier keys can be specified using space-delimited tokens as follows: `c` - Ctrl, `s` - Shift, `a` - Alt, `m` - Meta (Windows or Mac Command Key)
| `menuActiveDuration` | `120`  | Delay (in ms) to show an action menu item as being selected.
| `popupDelay` | `300`  | Delay (in ms) to wait before displaying a sub-menu when the user mouses over it.
| `prefix` | `menu`  | String prefixed to all classes generated by the widget. **If you change this you'll need to update the CSS file classes to match.**
| `skipDisabledItems` | `true`  | When true keyboard navigation keys will skip menu items that are disabled.

###### Example
```javascript
var menu = new Menu('menu', {
	hotkey: 'c s x',
	popupDelay: 200
});
```


##### HTML menu attributes

The following attributes may be assigned to static menu `<li>`s defined via HTML:

| Attribute | Default Value | Description
| ---------- | ------- | -----------
| `aria-checked` | `false`  | When `true` a checkbox or radio button menu item is marked as selected.
| `aria-disabled` | `false`  | When `true` a menu item is disabled and grayed out.  Disabled items will not fire `select` events.
| `data-icon` | `<blank>`  | Specifies a class to be added to the menu item's icon element.  Syntax: `class(`*`className`*`)`
| `data-shortcut` | `<blank>`  | Defines a keyboard shortcut for the menu item. May include a space-separated list of modifier key characters (`c`- Ctrl, `a` - Alt, `s` - Shift and `m` - Meta). Specifying a shortcut of `c a A` would trigger the menu item's `select` event by pressing the `Ctrl+Alt+a` keys simultaneously.  Function keys may be specified as Fnn.
| `role` | `menuitem`  | `menuitem` A simple action menu item.<br>`menuitemcheckbox` Defines a checkbox that can be toggled on/off.<br>`menuitemradio` Creates a menu item that represents one of a group of related options.  Only one option in the group can be selected at a time. When 'on' a blob is shown next to the menu item.

##### JavaScript API

Menus can be created and manipulated in JavaScript using the following API:
___
```javascript
addEventListener(eventType, callback)
```
Similar to the DOM event.  Listens for an `eventType` event and runs the `callback` function when the event is triggered.
See the Events section below for information about the events triggered by the widget.
___

```javascript
append(menuId, newItems)
```
Appends one or more items to a sub-menu attached to a menu item.
Will automatically create a new sub-menu if one does not yet exist.
Converts the menu item to a sub-menu style (with an arrow affordance), overriding any existing checkbox or radio button attributes.

`newItems` can be one (or an array) of:
* A string containing the new menu item's display text.
In this case the menu will be an enabled, default (action) menu with no icon whose ID is calculated by replacing any spaces or non-word characters in the text with a single hyphen.
**No check is made for duplicate IDs** - if you need two items with the same text you'll need to manually specify the ID of the menu - see below.
* An object describing the new menu item:
```javascript
{
    align: "right|left",                                // Align item to the right-hand side of the menubar (only applies to top-level items). Default = "left"
    checked: true|false,                                // Default = false
    className: "a-custom-class",                        // Adds a custom class name to the item. Default = ""
    disabled: true|false,                               // Default = false
    icon: "class(className)",                           // Default = ""
    id: "a-menu-id",                                    // If omitted will be calculated using text property
    name: "radio button group",                         // Radio button group name (only applies to radio buttons)
    placeholder: "Nothing to see here",                 // Placeholder text to show if a sub-menu has no items (default = "No items")
    role: "menuitem|menuitemcheckbox|menuitemradio",    // Menu item's role. One of "menuitem", "menuitemcheckbox" or "menuitemradio". Default = "menuitem"
    shortcut: "[c a d m] X|Fnn",                        // Keyboard shortcut, where c a d m represent optional modifier keys, X is an alphanumeric character and Fnn a function key number e.g. F12
    text: "some menu display text"                      // MANDATORY
 }
```
All properties except `text` are optional.
___

```javascript
clear(menuId, removeSubMenu)
```
Empties an item's sub-menu and (if `removeSubMenu` is `true`) removes the sub-menu entirely.
___

```javascript
get(menuId)
```
Returns the current properties of the menu item as an object.  Here's an example:
```javascript
{
    align: "left",
    checked: true,              // Returned for checkbox or radio button items only
    className: "",
    disabled: true,
    icon: "",
    id: "a-menu-item-id",
    menu: 1,
    name: "my-group",           // Name of the radio button group (radio button items only)
    placeholder: "No items",
    role: "menuitemcheckbox",
    shortcut: "s t"
 }
```
___

```javascript
getGroupChecked(groupName)
```
Returns the ID of the currently checked item in the given radio group, or null if the group doesn't exist or no element is checked.
___

```javascript
insertAfter(menuId, newItems)
```
Inserts one or more menu items immediately after a menu item and at the same level.
If menuID is blank or null the items will be appended to the top-level menu bar.
`newItems` can be one or an array of strings or objects specifying the new item(s) (see `append` above for more details).
___

```javascript
insertBefore(menuId, newItems)
```
Inserts one or more menu items immediately before a menu item and at the same level.
If menuID is blank or null the items will be prepended to the top-level menu bar.
`newItems` can be one or an array of strings or objects specifying the new item(s) (see `append` above for more details).
___

```javascript
prepend(menuId, newItems)
```
Prepends one or more item(s) to a sub-menu attached to a menu item.
Will automatically create a new sub-menu if one does not yet exist.
Converts the menu item to a sub-menu style (with an arrow affordance), overriding any existing checkbox or radio button attributes.
___

```javascript
remove(menuId)
```
Completely removes the given menu item (and any child sub-menus contained within it).
___

```javascript
removeEventListener(eventType, callback)
```
Similar to the DOM event.  Removes callback `callback` from the `eventType` event's listener chain.
___

```javascript
replace(menuId, newItems)
```
Completely replaces any sub-menu (and any child sub-menus) associated with the menu item with the new item(s).
The menu item itself is *not* removed - to do that use the `remove` method.
___

```javascript
set(menuId, newProperties)
```
Sets properties for the given menu item, where `newProperties` is a JavaScript object specifying the properties to be changed.
For details of the properties that can be set see the `get` method above.

##### Events

Three events are provided to allow you to respond to user interaction:

###### enter

Called when the user enters a menu item.  An item is entered when:
* Hovering over it with a mouse
* Touching it on a touchscreen (will also generate a `select` event)
* Navigating to an item using the keyboard

###### leave

Called when the user leaves a menu item.  An item is left when:
* The mouse pointer leaves the item.
* Another item (or anywhere outside the menu widget) is touched.
* Navigating to another item using the keyboard
* Hitting the `Esc` key to close the menu.

###### select

Called when the user selects a menu item.  An item can be selected by:
* Clicking on it with a mouse
* Touching it on a touchscreen
* Navigating to an item using the keyboard and then hitting the `Enter` key or `spacebar`
* Invoking the menu's keyboard shortcut (when specified)

*NOTE: Only enabled action (i.e. role=`menuitem`) items will trigger `select` events.*
