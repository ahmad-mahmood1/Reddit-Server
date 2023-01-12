"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const ioredis_1 = __importDefault(require("ioredis"));
require("reflect-metadata");
const type_graphql_1 = require("type-graphql");
const constants_1 = require("./constants");
const dataSource_1 = __importDefault(require("./dataSource"));
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const createPointsLoader_1 = require("./utils/createPointsLoader");
const createUserLoader_1 = require("./utils/createUserLoader");
const createVoteLoader_1 = require("./utils/createVoteLoader");
const main = async () => {
    await dataSource_1.default.initialize();
    const app = (0, express_1.default)();
    const corsConfig = {
        credentials: true,
        origin: "http://localhost:3000",
    };
    app.use((0, cors_1.default)(corsConfig));
    let RedisStore = require("connect-redis")(express_session_1.default);
    let redis = new ioredis_1.default();
    app.use((0, express_session_1.default)({
        name: "qid",
        store: new RedisStore({ client: redis, disableTouch: true }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax",
            secure: constants_1.__prod__,
        },
        saveUninitialized: false,
        secret: "keyboard cat",
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, post_1.PostResolver, user_1.UserResovler],
            validate: false,
        }),
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: (0, createUserLoader_1.createUserLoader)(),
            voteLoader: (0, createVoteLoader_1.createVoteLoader)(),
            pointsLoader: (0, createPointsLoader_1.createPointsLoader)(),
        }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });
    app.listen(4000, () => {
        "Listening on Port:4000";
    });
};
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map