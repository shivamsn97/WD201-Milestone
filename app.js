const express = require("express");
const csurf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const app = express();
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser("7y324tfrvyu38yaihy8ggdbasq7we34rrtyuvgds"));
app.use(csurf("897ygu328437twgetuyvas867ygusbhj", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");

app.use(
  session({
    secret: "sdfjhdf374t6yregwuhqy7e3gretufvd",
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        User.findOne({ where: { email: email } }).then((user) => {
          if (!user) {
            return done(null, false, { message: "Incorrect email" });
          }
          bcrypt.compare(password, user.password, (err, res) => {
            if (res) {
              return done(null, user);
            } else {
              return done(null, false, { message: "Incorrect password" });
            }
          });
        });
      } catch (err) {
        return err;
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log("deserializing user from session", id);
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.get("/", (request, response) => {
  response.render("index", {
    csrfToken: request.csrfToken(),
    title: "To-Do Manager",
  });
});

app.get("/healthz", (req, res) => {
  // This is a health check endpoint for render which always returns 200
  res.status(200).send("OK");
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const overdue = await Todo.overdue(userId);
    const dueToday = await Todo.dueToday(userId);
    const dueLater = await Todo.dueLater(userId);
    const completedTodos = await Todo.completed(userId);
    if (request.accepts("html")) {
      response.render("todos", {
        overdue: overdue,
        dueToday: dueToday,
        dueLater: dueLater,
        completedTodos: completedTodos,
        csrfToken: request.csrfToken(),
        title: "To-Do Manager",
      });
    } else {
      response.json({
        overdue: overdue,
        dueToday: dueToday,
        dueLater: dueLater,
        completedTodos: completedTodos,
      });
    }
  }
);

app.get("/signup", (request, response) => {
  response.render("signup", {
    csrfToken: request.csrfToken(),
    title: "Signup",
  });
});

app.post("/users", async (request, response) => {
  const firstName = request.body.firstName;
  const lastName = request.body.lastName;
  const email = request.body.email;
  if (!firstName || !email || !request.body.password) {
    request.flash("error", "Please fill in all fields");
    return response.redirect("/signup");
  }
  const password = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.status(500).send("Error logging in");
      } else {
        response.redirect("/todos");
      }
    });
  } catch (error) {
    request.flash("error", "Email already exists");
    response.redirect("/signup");
  }
});

app.get("/login", (request, response) => {
  response.render("login", {
    csrfToken: request.csrfToken(),
    title: "Login",
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/todos");
  }
);

// app.get("/todos/:id", async function (request, response) {
//   try {
//     const todo = await Todo.findByPk(request.params.id);
//     return response.json(todo);
//   } catch (error) {
//     console.log(error);
//     return response.status(422).json(error);
//   }
// });

app.get(
  "/signout",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response, next) => {
    request.logout((err) => {
      if (err) {
        return next(err);
      }
      return response.redirect("/");
    });
  }
);

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (!request.body.title || !request.body.dueDate) {
      request.flash("error", "Please fill in all fields");
      return response.redirect("/todos");
    }
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const todo = await Todo.findTodoById({
      id: request.params.id,
      userId: request.user.id,
    });
    try {
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const todo = await Todo.findTodoById({
      id: request.params.id,
      userId: request.user.id,
    });
    if (!todo) {
      return response.status(404).json(false);
    }
    try {
      await todo.deleteTodo();
      return response.json(true);
    } catch (error) {
      console.log(error);
      return response.status(422).json(false);
    }
  }
);

module.exports = app;
