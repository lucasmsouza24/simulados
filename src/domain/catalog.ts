import type { Bundle, Exam, ExamDomain, Localized, Question } from '../content/schema';

type Section = ExamDomain['sections'][number];
type Requirement = Section['requirements'][number];

export interface RequirementInfo {
  requirement: Requirement;
  section: Section;
  domain: ExamDomain;
}

export interface Catalog {
  exam: Exam;
  questions: Question[];
  byId: Map<string, Question>;
  requirements: Map<string, RequirementInfo>;
}

export function buildCatalog({ exam, questions }: Bundle): Catalog {
  const requirements = new Map<string, RequirementInfo>();
  for (const domain of exam.domains) {
    for (const section of domain.sections) {
      for (const requirement of section.requirements) {
        requirements.set(requirement.id, { requirement, section, domain });
      }
    }
  }
  return { exam, questions, byId: new Map(questions.map((q) => [q.id, q])), requirements };
}

export function domainOf(catalog: Catalog, question: Question): ExamDomain | undefined {
  return catalog.requirements.get(question.requirement)?.domain;
}

export function requirementName(catalog: Catalog, question: Question): Localized | undefined {
  return catalog.requirements.get(question.requirement)?.requirement.name;
}
