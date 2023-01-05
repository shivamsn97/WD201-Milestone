"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
      Todo.belongsTo(models.User, { foreignKey: "userId" });
    }

    static addTodo({ title, dueDate, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId: userId,
      });
    }

    static findTodoById({ id, userId }) {
      return this.findOne({ where: { id: id, userId: userId } });
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }

    setCompletionStatus(status) {
      return this.update({ completed: status });
    }

    static async getTodos() {
      return await this.findAll();
    }

    async deleteTodo() {
      await this.destroy();
    }

    static async overdue(userId, includeCompleted = false) {
      if (includeCompleted) {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.lt]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
          },
        });
      } else {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.lt]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
            completed: false,
          },
        });
      }
    }

    static async dueToday(userId, includeCompleted = false) {
      if (includeCompleted) {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.eq]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
          },
        });
      } else {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.eq]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
            completed: false,
          },
        });
      }
    }

    static async dueLater(userId, includeCompleted = false) {
      if (includeCompleted) {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.gt]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
          },
        });
      } else {
        return await Todo.findAll({
          where: {
            dueDate: {
              [Op.gt]: new Date().toLocaleDateString("en-CA"),
            },
            userId,
            completed: false,
          },
        });
      }
    }

    static async completed(userId) {
      return await Todo.findAll({
        where: {
          completed: true,
          userId,
        },
      });
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
