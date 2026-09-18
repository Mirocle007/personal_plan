import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { HABIT_FREQUENCIES } from '../constants';

export interface HabitAttrs {
  id: number;
  name: string;
  icon: string;
  frequency: string;
  weeklyTarget: number | null;
  sortOrder: number;
}

class Habit extends Model<Optional<HabitAttrs, 'id'>> {
  public id!: number;
  public name!: string;
  public icon!: string;
  public frequency!: string;
  public weeklyTarget!: number | null;
  public sortOrder!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Habit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: '习惯名称不能为空' }
      }
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '✅'
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'daily',
      validate: {
        isIn: {
          args: [HABIT_FREQUENCIES as unknown as string[]],
          msg: '频率必须是 daily 或 weekly'
        }
      }
    },
    weeklyTarget: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 7
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'Habit'
  }
);

export default Habit;
