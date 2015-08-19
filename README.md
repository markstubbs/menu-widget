#### About the Menu Widget

This widget aims to emulate a 'real' desktop menu control as much as possible.
Highlights include:

* Supports both fixed menus defined via HTML and dynamic items modified via a JavaScript API.
* Supports up to 4 levels of hierarchical menus.
* Supports right-aligned menus.
* Includes ARIA-compliant roles.
* Full keyboard support, including menu activation hotkeys, navigation and global keyboard shortcuts.
* Platform-aware styling for OS X and Windows (including Windows 10).
* Does **not** rely on CSS hover. Menus will not appear until the user clicks on the widget and don't disappear if you accidentally mouse out of an open menu hierarchy.
* Works with IE8+, Chrome, Firefox and Safari.
* Compatible with touch devices.
* Self contained; no framework dependencies (IE8 support needs jQuery 1.3/1.4).

#### Online Demo
See it in action at [Menu Demo](http://menu.markstubbs.info/)


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

#### Creating Your First Menu

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
                menu2B
                <ul>
                    <li>action 5</li>
                    <li>
                        submenu 1
                        <ul>
                            <li>
                                action 6
                                <ul>
                                    <li>action 8</li>
                                </ul>
                            </li>
                            <li>action 7</li>
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

which will be rendered like this (on a Mac):

![Menu sample 1](./screenshots/menu1.png)
![Menu sample 2](./screenshots/menu2.png)

The top-level menubar is defined as a `<ul>` with a unique ID and a `display: none` style to prevent a [FOUC](https://en.wikipedia.org/wiki/Flash_of_unstyled_content).
Menu action items are defined by adding `<li>`s to the list.
Sub-menus are created by simply nesting `<ul>`s inside `<li>`s as shown in the example.


