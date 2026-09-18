import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';

class ProgressUpdate extends Model {
  public id!: number;
  public taskId!: number;
  public updateTime!: Date;
  public description!: string | null;
  public statusChange!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ProgressUpdate.init(
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
    updateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    statusChange: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: {
          args: [['未开始', '进行中', '待审核', '已完成', '已取消']],
          msg: '状态变更值不合法'
        }
      }
    }
  },
  {
    sequelize,
    modelName: 'ProgressUpdate'
  }
);

// 关联关系（删除任务时级联删除进度记录）
ProgressUpdate.belongsTo(Task, { foreignKey: 'taskId', onDelete: 'CASCADE' });
Task.hasMany(ProgressUpdate, { foreignKey: 'taskId', onDelete: 'CASCADE' });

export default ProgressUpdate;
