import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';

export interface SubTaskAttrs {
  id: number;
  taskId: number;
  title: string;
  done: boolean;
  sortOrder: number;
}

class SubTask extends Model<Optional<SubTaskAttrs, 'id'>> {
  public id!: number;
  public taskId!: number;
  public title!: string;
  public done!: boolean;
  public sortOrder!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

SubTask.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Task,
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: '子任务内容不能为空' }
      }
    },
    done: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'SubTask'
  }
);

Task.hasMany(SubTask, { foreignKey: 'taskId', onDelete: 'CASCADE' });
SubTask.belongsTo(Task, { foreignKey: 'taskId', onDelete: 'CASCADE' });

export default SubTask;
