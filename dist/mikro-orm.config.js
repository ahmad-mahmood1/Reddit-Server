"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const constants_1 = require("./constants");
const mikroConfig = {
    migrations: {
        path: path_1.default.join(__dirname, "./migrations"),
        glob: "!(*.d).{js,ts}",
    },
    entities: [path_1.default.join(__dirname, "./entities")],
    dbName: "tracker",
    user: "postgres",
    password: "postgres",
    type: "postgresql",
    debug: !constants_1.__prod__,
};
exports.default = mikroConfig;
//# sourceMappingURL=mikro-orm.config.js.map