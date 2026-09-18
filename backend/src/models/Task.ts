import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants';
import Project from './Project';

export interface TaskAttrs {
  id: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string | null;
  projectId: number | null;
  status: string;
  tags: string[];
  completedAt: Date | null;
  sortOrder: number;
}

class Task extends Model<Optional<TaskAttrs, 'id'>> {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public dueDate!: Date | null;
  public priority!: string | null;
  public projectId!: number | null;
  public status!: string;
  public tags!: string[];
  public completedAt!: Date | null;
  public sortOrder!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: '任务标题不能为空' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: {
          args: [TASK_PRIORITIES as unknown as string[]],
          msg: '优先级必须是：高、中、低'
        }
      }
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Project,
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '未开始',
      validate: {
        isIn: {
          args: [TASK_STATUSES as unknown as string[]],
          msg: '状态必须是：未开始、进行中、待审核、已完成、已取消'
        }
      }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'Task'
  }
);

// 关联关系
Task.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId' });

export default Task;
