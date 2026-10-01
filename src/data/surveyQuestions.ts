export enum QuestionType {
    MultipleChoice, MultipleChoiceHorizontal, Ranked, Instruction, Text, Image1, Image2, ContinuousExplanation,
    dropDownMenuComponent1, dropDownMenuComponent2
}
export enum TextAreaType { Small, Number, Large }

export type SurveyQuestion = {
    type: QuestionType,
    text?: string,
    responses?: string[],
    followUps?: (null | SurveyQuestion | SurveyQuestion[])[],
    id?: string,
    params?: {
        textAreaType?: TextAreaType,
        control?: 'dropdown'
    },
};

export type SurveyPage = {
    withExplanationOnly?: boolean,
    questions: SurveyQuestion[]
};

const specializationOptions = [
    "Continental Scientific Drilling",
    "Energy Geology",
    "Environmental and Engineering Geology",
    "Geoarchaeology",
    "Geobiology and Geomicrobiology",
    "Geochronology",
    "Geoinformatics and Data Science",
    "Geology and Health",
    "Geology and Society",
    "Geophysics and Geodynamics",
    "Geoscience Education",
    "History and Philosophy of Geology",
    "Hydrogeology",
    "Karst",
    "Limnogeology",
    "Marine and Coastal Geoscience",
    "Mineralogy, Geochemistry, Petrology, and Volcanology",
    "Planetary Geology",
    "Quaternary Geology and Geomorphology",
    "Sedimentary Geology",
    "Soils and Soil Processes",
    "Structural Geology and Tectonics",
    "Other"
];

const workSettingOptions = [
    "I primarily work in academia",
    "I primarily work in industry",
    "I primarily work in state surveys/USGS",
    "I primarily work for a governmental entity",
    "I work about the same amount in academia and industry",
    "Other"
];

export const surveyPages: SurveyPage[] = [
    {
        withExplanationOnly: true,
        questions: [
            {
                id: "explanationUseFrequency",
                type: QuestionType.MultipleChoice,
                text: "How often did you utilize the provided explanations to determine if to accept/reject the robot’s sampling suggestions?",
                responses: ["Always", "Most of the time", "Sometimes", "Rarely", "Never"]
            },
            {
                id: "explanationEase",
                type: QuestionType.MultipleChoice,
                text: "How easy was it to use the information in the explanation to determine to accept/reject the robot’s sampling suggestions?",
                responses: ["Very easy", "Easy", "Somewhat easy", "Difficult", "Very difficult"]
            }
        ]
    },
    {
        questions: [
            {
                id: "demographicIntro",
                type: QuestionType.Instruction,
                text: "Please respond to a few final demographic questions."
            },
            {
                id: "age",
                type: QuestionType.Text,
                text: "What is your age?",
                params: { textAreaType: TextAreaType.Number }
            },
            {
                id: "gender",
                type: QuestionType.MultipleChoice,
                text: "What is your gender?",
                responses: ["Woman", "Man", "Gender Variant / Non-conforming", "Prefer to self describe", "Prefer not to say"],
                followUps: [
                    null,
                    null,
                    null,
                    {
                        id: "genderSelfDescribe",
                        type: QuestionType.Text,
                        text: "Please describe your gender."
                    },
                    null
                ]
            },
            {
                id: "specialization",
                type: QuestionType.MultipleChoice,
                text: "How would you describe your specialization?",
                responses: specializationOptions,
                params: { control: 'dropdown' },
                followUps: specializationOptions.map((option, i) => (
                    i === specializationOptions.length - 1
                        ? {
                            id: "specializationOther",
                            type: QuestionType.Text,
                            text: "You selected \"Other\" for the previous question, please provide your specialization here:",
                            params: { textAreaType: TextAreaType.Small }
                        }
                        : null
                ))
            },
            {
                id: "yearsInSpecialization",
                type: QuestionType.Text,
                text: "How many years of experience do you have in your specialization?",
                params: { textAreaType: TextAreaType.Number }
            },
            {
                id: "workSetting",
                type: QuestionType.MultipleChoice,
                text: "Do you primarily work in industry or academia?",
                responses: workSettingOptions,
                followUps: [
                    null,
                    null,
                    null,
                    null,
                    null,
                    {
                        id: "workSettingOther",
                        type: QuestionType.Text,
                        text: "You selected \"Other\" for the previous question, please provide your professional environment here:",
                        params: { textAreaType: TextAreaType.Small }
                    }
                ]
            },
            {
                id: "highestDegree",
                type: QuestionType.MultipleChoice,
                text: "What is the highest degree/academic appointment you have obtained?",
                responses: ["currently undergraduate", "bachelors", "masters", "PhD", "postdoc", "professor"]
            },
            {
                id: "yearsSinceBachelors",
                type: QuestionType.Text,
                text: "How many years has it been since you earned your bachelor's degree?",
                params: { textAreaType: TextAreaType.Number }
            },
            {
                id: "scenarioFamiliarity",
                type: QuestionType.MultipleChoice,
                text: "Are you familiar with any of the features of this decision making scenario? Have you ever collected data at White Sands National Monument before or investigated a similar research question?",
                responses: ["Yes", "No"],
                followUps: [
                    {
                        id: "scenarioFamiliarityDetail",
                        type: QuestionType.Text,
                        text: "Please explain which features of the scenario you are familiar with."
                    },
                    null
                ]
            }
        ]
    },
    {
        questions: [
            {
                id: "thankYou",
                type: QuestionType.Instruction,
                text: "Thank you for your responses! You have completed this survey."
            }
        ]
    }
];
