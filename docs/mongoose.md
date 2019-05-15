# Mongoose

## With ApiPackExpress

```js
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// Connect database
mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true
});

// Load your models
const { Project, Task } = require("./models");
const models = [Project, Task];

// Import Mongoose ApiPack
const { ApiPack } = require("@kolinalabs/api-pack-mongoose");

// Import ExpressJS ApiPack (router stack)
const RouterStack = require("@kolinalabs/api-pack-express");

// Instantiate + build routes
const apiPack = new ApiPack(models);
const routes = apiPack.routing(RouterStack);

const app = express();
app.use(bodyParser.json());
app.use("/api", routes);

app.listen(process.env.APP_PORT);
```

## With ApiPackKoa

```js
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const mongoose = require("mongoose");

// Connect database
mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true
});

// Load your models
const { Project, Task } = require("./models");
const models = [Project, Task];

// Import Mongoose ApiPack
const { ApiPack } = require("@kolinalabs/api-pack-mongoose");

// Import KoaJS ApiPack (router stack)
const RouterStack = require("@kolinalabs/api-pack-koa");

// Instantiate + build routes
const apiPack = new ApiPack(models);
const routing = apiPack.routing(RouterStack);
routing.prefix("/api");

const app = new Koa();
app.use(bodyParser());
app.use(routing.routes());

app.listen(process.env.APP_PORT);
```

### Model Configuration

#### Easy

By default, it is not necessary to make any special configuration in the model so that it works correctly with ApiPack.

```js
const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: String,
  status: String,
  note: String,
  priority: Number,
  closed: Boolean,
  openedAt: Date,
  closedAt: Date
});

const Task = mongoose.model("Task", TaskSchema);
```

#### Advanced

To configure advanced mode, add the static `ApiPack()` method to your model.

```js
const ProjectSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    amount: Number,
    priority: Number,
    isPrivate: Boolean,
    isLocked: Boolean,
    status: String
  },
  {
    timestamps: true
  }
);

// ApiPack configuration
ProjectSchema.statics.ApiPack = function() {
  return {
    name: "AdvancedProject",
    description: "This is my project with advanced mode.",
    operations: {
      paginate: true,
      retrieve: true,
      create: true,
      update: true,
      remove: false // disable operation
    },
    pagination: {
      enabled: false // disable pagination
    },
    filters: {
      boolean: {
        properties: ["isPrivate", "isLocked"]
      },
      date: {
        properties: ["createdAt", "updatedAt"]
      },
      exists: {
        properties: ["status"]
      },
      numeric: {
        properties: ["amount", "priority"]
      },
      order: {
        properties: ["_id", "amount", "priority", "title"]
      },
      range: {
        properties: ["amount", "priority"]
      },
      search: {
        properties: ["title", "description", "status"]
      }
    }
  };
};

const Project = mongoose.model("Project", ProjectSchema);
```

## Operations

By default, five operations are active in ApiPack:

In this example, we assume that there is a `Project` resource

| NAME       | TYPE         | METHOD   | PATH            |
| ---------- | ------------ | -------- | --------------- |
| `paginate` | `collection` | `GET`    | `/projects`     |
| `create`   | `collection` | `POST`   | `/projects`     |
| `retrieve` | `item`       | `GET`    | `/projects/:id` |
| `update`   | `item`       | `PUT`    | `/projects/:id` |
| `remove`   | `item`       | `DELETE` | `/projects/:id` |

**Disabling operations:**

Method 1:

```js
schema.statics.ApiPack = function() {
  return {
    operations: ["paginate", "retrieve"]
  };
};
```

Method 2:

```js
schema.statics.ApiPack = function() {
  return {
    operations: {
      paginate: true,
      retrieve: true,
      create: false,
      update: false,
      remove: false
    }
  };
};
```

In the above examples, the `create`,`update` and `remove` operations are disabled.

## Persister

This package provides the persistence performer for ApiPack operations.

It is already configured with the `persist()` and `remove()` methods used for add, update and remove operations.

## Provider

The data provider acts in the `READ` and `DESERIALIZE` steps.

This mechanism makes it possible to recover data in one of the following ways:

- Item: Retrieved when the operation has an identifier (eg: retrieve, update or delete)
- Collection: When it does not have an item identifier (paginated or not)
- Instance: Used to initialize an instance of the resource associated with the operation

## Serializer

Although not strictly necessary, a simple serializer is provided with the package,
it has the serialization and data deserialization functionality for the operation.

However, you can replace the serializer when needed, for a custom:

```js
const MyCustomSerializer = {
  serialize(operation) {
    // Your custom logic to add/remove/change
    // "operation.data" properties before response
  },
  deserialize(operation) {
    // Your custom logic to populate resource instance (operation.data)
  }
};

// Override apiPack default serializer
apiPack.serializers.splice(0, 1, MyCustomSerializer);
```

## Filters

By default, all ApiPack filters are disabled, to use them you must activate each one separately.

### Boolean

Used to filter fields with boolean values.

Syntax: `?property=<true|false|1|0|on|off|yes|no>`

> To maintain compatibility with later version analyzes, it is recommended to use this filter with one of the following values:
> true/false/1/0

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      boolean: {
        properties: ["enabled", "isLocked"]
      }
    }
  };
};
```

Example: `/projects?isLocked=true`

### Date

Used to filter results based on a date intervals.

| STRATEGY        | EQUIVALENT TO |
| --------------- | ------------- |
| `after`         | `>= value`    |
| `before`        | `<= value`    |
| `strict_after`  | `> value`     |
| `strict_before` | `< value`     |

Syntax: `?property[<after|before|strict_after|strict_before>]=value`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      date: {
        properties: ["createdAt", "updatedAt"]
      }
    }
  };
};
```

Example: `/projects?createdAt[before]=2019-05-10&updatedAt[after]=2019-05-20`

**NULL Management Strategies**

| STRATEGY              | DESCRIPTION                |
| --------------------- | -------------------------- |
| `include_null_after`  | Consider items as youngest |
| `include_null_before` | Consider items as oldest   |
| `exclude_null`        | Exclude items              |
| `include_null`        | Include items always       |

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      date: {
        properties: {
          createdAt: "include_null",
          updatedAt: "include_null_before"
        }
      }
    }
  };
};
```

### Exists

Used to filter results with null or non-null values.

Syntax: `?property[exists]=<true|false|1|0>`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      exists: {
        properties: ["description", "status", "note"]
      }
    }
  };
};
```

Example: `/projects?status[exists]=true&note[exists]=false`

### Numeric

This filter allows searching on properties with numerical values.

Syntax: `?property=<int|float>`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      numeric: {
        properties: ["amount", "priority"]
      }
    }
  };
};
```

Example: `/projects?priority=25`

### Order

Lets you sort a collection of results based on the configured properties.

Syntax: `?order[property]=<asc|desc|1|-1>`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      order: {
        properties: ["amount", "priority", "title"]
      }
    }
  };
};
```

Example: `/projects?order[title]=desc&order[priority]=asc`

By default, when a direction is not informed, the computer assumes as ascending:

Example: `/projects?order[amount]&order[priority]`

The default direction can be set in a custom filter setting by using the `defaultDirection` property

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      order: {
        properties: {
          amount: "asc",
          priority: "desc",
          title: "asc"
        }
      }
    }
  };
};
```

### Range

This filter is used for comparisons at the following levels:

- lower than (lt)
- greather than (gt)
- lower than or equal (lte)
- greather than or equal (gte)

Syntax: `?property[<lt|gt|lte|gte|between>]=value`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      range: {
        properties: ["amount", "priority"]
      }
    }
  };
};
```

Example: `/projects?priority[gte]=10&amount[between]=500..800`

In the example, `between` strategy is equivalent to `/projects?amount[gt]=500&amount[lt]=800`

### Search

This filter provides the possibility of textual search in four different strategies:

| STRATEGY     | SQL EQUIVALENT               |
| ------------ | ---------------------------- |
| `partial`    | `LIKE %text%`                |
| `start`      | `LIKE text%`                 |
| `end`        | `LIKE %text`                 |
| `word_start` | `LIKE text% OR LIKE % text%` |

The above settings are `case sensitive`, ie a query `?title=foo` will be interpreted differently than `title=Foo`.

To allow case insensitive queries, include the prefix `i` in the configured strategies (e.g: `ipartial`, `iexact`).

Syntax: `?property1=foo&property2=bar`

Configuration:

```js
schema.statics.ApiPack = function() {
  return {
    filters: {
      search: {
        properties: {
          title: "ipartial",
          description: "partial",
          status: "exact"
        }
      }
    }
  };
};
```

## Pagination

By default, this feature provides a built-in pager, also with default settings.
However, you can customize both your settings and their features if necessary.

The complete paging setup example:

```js
schema.statics.ApiPack = function() {
  return {
    pagination: {
      enabled: true,
      pageParameter: "pg",
      clientEnabled: true,
      enabledParameter: "paging",
      itemsPerPage: 50,
      clientItemsPerPage: true,
      itemsPerPageParameter: "per_page",
      maxItemsPerPage: 100
    }
  };
};
```

| PARAMETER               | DESCRIPTION                                                   | DEFAULT        |
| ----------------------- | ------------------------------------------------------------- | -------------- |
| `enabled`               | Enable/disable pagination                                     | `true`         |
| `pageParameter`         | Page parameter name                                           | `page`         |
| `clientEnabled`         | Allow to enable/disable pager via client-side (GET parameter) | `false`        |
| `enabledParameter`      | Parameter name to enable/disable pagination                   | `pagination`   |
| `itemsPerPage`          | Set number of items per page                                  | `30`           |
| `clientItemsPerPage`    | Allow change `itemsPerPage` via client-side (GET parameter)   | `false`        |
| `itemsPerPageParameter` | Parameter name to set number of items per page                | `itemsPerPage` |
| `maxItemsPerPage`       | Maximum number of items per page                              | `null`         |

## Extensions

Extensions allow you to add extra criteria to queries during the execution of the operation.

This package is configured with two standard extensions [`FilterExtension`](mongoose.html#filters)
and [`PagerExtension`](mongoose.html#pagination), which act exclusively on `collection` type and `get` method operations.

### Custom Extensions

You can add as many custom extensions as you wish using the `apiPack.addExtension` method.

Any added extension must have the `apply(query, operation)` method/function for its functionality to be made available.

`query` and`operation` arguments are not required, but inhibiting them will mean that you do not have access to the operation information,
nor to the `query` that will be executed after the stack of extensions.

```js
const MyCustomExtension = {
  name: "MyCustomExtension",
  apply(query, operation) {
    // Your query increment logic
    // e.g.: query.where('property', 'value')
  }
};

apiPack.addExtension(MyCustomExtension);
```

By default, new extensions are run before the native extensions of the package (`FilterExtension` and `PagerExtension`).

**Example**

Imagine that you want to restrict the results of a project query, added to the criteria of the query, the information regarding the logged in user.

We assume that at this point your `request` or similar already has the information of the logged in user (e.g.: your id).

This would be the suggested format for your query extension:

```js
const UserReferenceExtension = {
  name: "UserReferenceExtension",
  apply(query, operation) {
    /**
     * Note: The `api-pack-express` and` api-pack-koa` packages
     * include the `request` object automatically in the context of the operation.
     * If you are using a custom route stack, watch out for this detail.
     * See more about this in the referenced resource documentation.
     */

    // Retrieve the "userId" information
    const userId = operation.context.request.user.id;
    // Add query criteria
    query.where("userId", userId);
  }
};
```

### Restricting Extension Execution

In some cases it is necessary to restrict the execution of an extension in advance.

Support management allows you to set up at times how an extension can run.

A support configuration can be done by methods, types, functions, and methods of a series of methods and a merge.

By default if the `supports` property of the extension is `not set`(`undefined`), the check defaults to`true`.

**Configuration modes (string/array\<string\>)**

| CONFIG                            | EXPLAIN                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| `"get"`                           | method == get                                                               |
| `"post"`                          | method == post                                                              |
| `"put"`                           | method == put                                                               |
| `"delete"`                        | method == delete                                                            |
| `["get", "post"]`                 | method == get OR method == post                                             |
| `"item"`                          | type == item                                                                |
| `"collection"`                    | type == collection                                                          |
| `["collection", "put"]`           | type == collection OR method == put                                         |
| `"collection:get"`                | type == collection AND method == get                                        |
| `["collection:post", "item:get"]` | (type == collection AND method == post) OR (type == item AND method == get) |

**Example**

Let's say that the extension of the above example should only be executed during the collection (`get`) and update (`put`) of the resource.

```js
const UserReferenceExtension = {
  name: "UserReferenceExtension",
  supports: ["collection:get", "put"]
  apply(query, operation) {
    // ....
  }
};
```

However, if you want to have more control over the extension's support decision, you can use a function.

The configured function will receive as an argument the `operation` and also the`query` (**in this order!**):

```js
const UserReferenceExtension = {
  name: "UserReferenceExtension",
  supports(operation, query) {
    // The 'resource' is your model
    // Apply only if Model is "Project"
    return operation.resource.modelName === "Project";
  },
  apply(query, operation) {
    // ....
  }
};
```

<!--
### FilterExtension

### PagerExtension

### Custom Extensions
-->
