import React, { useCallback } from 'react';
import DocumentHead from 'calypso/components/data/document-head';
import SurveyContainer from 'calypso/components/survey-container';
import { Question } from 'calypso/components/survey-container/types';
import {
	useCachedAnswers,
	useSaveAnswersMutation,
	useSurveyStructureQuery,
} from 'calypso/data/segmentaton-survey';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import useSegmentationSurveyNavigation from './hooks/use-segmentation-survey-navigation';

type SegmentationSurveyProps = {
	surveyKey: string;
	onBack?: () => void;
	onNext?: ( questionKey: string, answerKeys: string[], isLastQuestion?: boolean ) => void;
};

/**
 * A component that renders a segmentation survey.
 * @param {SegmentationSurveyProps} props
 * @param {string} props.surveyKey - The key of the survey to render.
 * @param {() => void} [props.onBack] - A function that navigates to the previous step.
 * @param {(questionKey: string, answerKeys: string[], isLastQuestion?: boolean) => void} [props.onNext] - A function that navigates to the next question/step.
 * @returns {React.ReactComponentElement}
 */
const SegmentationSurvey = ( { surveyKey, onBack, onNext }: SegmentationSurveyProps ) => {
	const { data: questions } = useSurveyStructureQuery( { surveyKey } );
	const { mutateAsync, isPending } = useSaveAnswersMutation( { surveyKey } );
	const { answers, setAnswers, clearAnswers } = useCachedAnswers( surveyKey );

	const onChangeAnswer = useCallback(
		( questionKey: string, value: string[] ) => {
			const newAnswers = { ...answers, [ questionKey ]: value };
			setAnswers( newAnswers );
		},
		[ answers, setAnswers ]
	);

	const handleSave = useCallback(
		async ( currentQuestion: Question, answerKeys: string[] ) => {
			try {
				await mutateAsync( {
					questionKey: currentQuestion.key,
					answerKeys,
				} );

				const isLastQuestion = questions?.[ questions.length - 1 ].key === currentQuestion.key;

				if ( questions?.[ questions.length - 1 ].key === currentQuestion.key ) {
					clearAnswers();
				}

				onNext?.( currentQuestion.key, answerKeys, isLastQuestion );
			} catch ( e ) {
				const error = e as Error;

				recordTracksEvent( 'calypso_segmentation_survey_error', {
					survey_key: surveyKey,
					question_key: currentQuestion.key,
					answer_keys: answerKeys.join( ',' ),
					error_message: error.message,
				} );
			}
		},
		[ clearAnswers, mutateAsync, onNext, questions, surveyKey ]
	);

	const onContinue = useCallback(
		async ( currentQuestion: Question ) => {
			await handleSave( currentQuestion, answers[ currentQuestion.key ] || [] );
		},
		[ answers, handleSave ]
	);

	const onSkip = useCallback(
		async ( currentQuestion: Question ) => {
			await handleSave( currentQuestion, [ 'skip' ] );
		},
		[ handleSave ]
	);

	const { currentPage, currentQuestion, backToPreviousPage, continueToNextPage, skipToNextPage } =
		useSegmentationSurveyNavigation( {
			onBack,
			onContinue,
			onSkip,
			answers,
			questions,
			surveyKey,
		} );

	if ( ! questions ) {
		return null;
	}

	return (
		<>
			<DocumentHead title={ currentQuestion?.headerText } />

			<SurveyContainer
				questions={ questions }
				answers={ answers }
				currentPage={ currentPage }
				onBack={ backToPreviousPage }
				onContinue={ continueToNextPage }
				onSkip={ skipToNextPage }
				onChange={ onChangeAnswer }
				disabled={ isPending }
			/>
		</>
	);
};

export default SegmentationSurvey;
