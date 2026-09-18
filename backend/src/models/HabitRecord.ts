import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Habit from './Habit';

export interface HabitRecordAttrs {
  id: number;
  habitId: number;
  date: string; // YYYY-MM-DD（本地时区）
}

class HabitRecord extends Model<Optional<HabitRecordAttrs, 'id'>> {
  public id!: number;
  public habitId!: number;
  public date!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

HabitRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    habitId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Habit,
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\d{4}-\d{2}-\d{2}$/
      }
    }
  },
  {
    sequelize,
    modelName: 'HabitRecord',
    indexes: [
      {
        unique: true,
        fields: ['habitId', 'date']
      }
    ]
  }
);

Habit.hasMany(HabitRecord, { foreignKey: 'habitId', onDelete: 'CASCADE' });
HabitRecord.belongsTo(Habit, { foreignKey: 'habitId', onDelete: 'CASCADE' });

export default HabitRecord;
