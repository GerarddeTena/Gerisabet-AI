import { invoke } from '@tauri-apps/api/core'
import { logError } from '../../utils/log'

export interface SkillEntry {
  name: string
  skillType: string
  content: string
  path: string
}

export interface SkillsDir {
  path: string
  skills: SkillEntry[]
  ruleSkills: SkillEntry[]
  otherSkills: SkillEntry[]
}

export async function loadSkillsDir(dirPath: string): Promise<SkillsDir> {
  try {
    const skills = await invoke<SkillEntry[]>('list_skills', { dirPath })
    const ruleSkills = skills.filter((s) => s.skillType === 'rules')
    const otherSkills = skills.filter((s) => s.skillType !== 'rules')

    return {
      path: dirPath,
      skills,
      ruleSkills,
      otherSkills,
    }
  } catch (err) {
    logError(err, 'loadSkillsDir')
    return {
      path: dirPath,
      skills: [],
      ruleSkills: [],
      otherSkills: [],
    }
  }
}

export async function getSkillContent(
  skillType: string,
  skillName: string
): Promise<string | null> {
  try {
    return await invoke<string | null>('get_skill_content', {
      skillType,
      skillName,
    })
  } catch (err) {
    logError(err, 'getSkillContent')
    return null
  }
}
