import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { PROJECT_COLORS } from '../constants';

export interface ProjectAttrs {
  id: number;
  name: string;
  description: string | null;
  manager: string | null;
  color: string | null;
}

class Project extends Model<Optional<ProjectAttrs, 'id'>> {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public manager!: string | null;
  public color!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Project.init(
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
        notEmpty: { msg: '项目名称不能为空' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    manager: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: PROJECT_COLORS[0],
      validate: {
        is: /^#[0-9a-fA-F]{6}$/
      }
    }
  },
  {
    sequelize,
    modelName: 'Project'
  }
);

export default Project;
