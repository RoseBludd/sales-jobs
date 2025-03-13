# Monday SDK JS Documentation

## Overview
The monday.com SDK provides tools for building applications on top of monday.com. Use it to:
- Access monday.com data via GraphQL
- Build custom board views and dashboard widgets
- Create integrations and automations

## Installation

**npm**
```bash
npm install monday-sdk-js --save
```

```javascript
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();
monday.setApiVersion("2023-10");
```

**HTML script tag**
```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/monday-sdk-js/dist/main.js"></script>
</head>
```

```javascript
const monday = window.mondaySdk();
```

## Core Functions

### monday.api
Query the GraphQL API on behalf of the connected user or using an API token.

```javascript
// Client-side example
monday.api(`query { users { id, name } }`).then(res => {
  console.log(res);
});

// Server-side example
monday.setToken('ac5eb492f8c...');
monday.api('query { users { name } }').then(res => {...});
```

### monday.listen
Create listeners for client-side events.

```javascript
// Listen for settings changes
monday.listen("settings", res => {
  console.log(res.data);
});

// Listen for multiple event types
monday.listen(['settings', 'context'], callback);

// Unsubscribe from events
const unsubscribe = monday.listen("events", callback);
unsubscribe();
```

Available event types:
- `context`: Changes in context parameters
- `settings`: Changes in setting values
- `itemIds`: Changes in board filter
- `events`: Board interactions (new_items, change_column_values, etc.)
- `filter`: Search filter changes
- `location`: URL location changes

### monday.get
Retrieve data from the parent monday.com application.

```javascript
// Get app context
monday.get("context").then(res => console.log(res));

// Get app settings
monday.get("settings").then(res => console.log(res));

// Get filtered items
monday.get("itemIds").then(res => console.log(res));

// Get session token
monday.get("sessionToken").then(token => {
  // Use token for auth between frontend and backend
});
```

### monday.execute
Invoke actions on monday.com.

```javascript
// Show a notice
monday.execute("notice", { 
  message: "Success!",
  type: "success", // "error", "info"
  timeout: 5000
});

// Open a confirmation dialog
monday.execute("confirm", {
  message: "Are you sure?", 
  confirmButton: "Yes", 
  cancelButton: "No"
}).then(res => console.log(res.data));

// Open a modal
monday.execute("openAppFeatureModal", {
  urlPath: "path/to/page",
  height: "500px",
  width: "800px"
});
```

Key actions include:
- `notice`: Display notifications
- `confirm`: Show confirmation dialog
- `openAppFeatureModal`: Open a modal window
- `openItemCard`: Open an item's card
- `closeAppFeatureModal`: Close a modal
- `openSettings`: Open view settings
- `closeSettings`: Close view settings
- Various document block manipulation methods

### monday.storage
Key-value storage for app data.

**Instance storage** (tied to a specific app instance):
```javascript
// Set item
monday.storage.instance.setItem('myKey', 'myValue')
  .then(res => console.log(res));

// Get item
monday.storage.instance.getItem('myKey')
  .then(res => console.log(res.data.value));

// Delete item
monday.storage.instance.deleteItem('myKey')
  .then(res => console.log(res));
```

**Global storage** (shared across all app instances):
```javascript
monday.storage.setItem('globalKey', 'globalValue');
monday.storage.getItem('globalKey');
monday.storage.searchItem('key'); // Partial key search
monday.storage.deleteItem('globalKey');
```

### monday.set
Set data inside your application.

```javascript
// Update app settings
monday.set("settings", {
  "text": "New value",
  "number": 10
}).then(res => console.log(res));

// Update URL query parameters
monday.set("location", { query: { foo: 'bar' } });
```

## TypeScript Support
TypeScript definitions are available in SDK versions 0.3.0+. Type declarations are in the `types/index.d.ts` file.
