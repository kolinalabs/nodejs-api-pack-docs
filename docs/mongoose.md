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
const routing = apiPack.routing(router);
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

<!-- ## Extensions

### FilterExtension

### PagerExtension

### Custom Extensions
-->
