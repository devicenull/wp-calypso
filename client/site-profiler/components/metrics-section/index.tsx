import styled from '@emotion/styled';
import React, { ForwardedRef, forwardRef } from 'react';
import { calculateMetricsSectionScrollOffset } from 'calypso/site-profiler/utils/calculate-metrics-section-scroll-offset';

interface MetricsSectionProps {
	name: string;
	title: string | React.ReactNode;
	subtitle: string | React.ReactNode;
	children?: React.ReactNode;
}

const Container = styled.div`
	margin: 150px 0;
	scroll-margin-top: ${ calculateMetricsSectionScrollOffset }px;
`;

const NameSpan = styled.span`
	font-family: 'SF Pro Text';
	color: var( --studio-gray-40 );
	font-size: 16px;
	margin-bottom: 8px;
`;

const Title = styled.div`
	font-family: 'SF Pro Display';
	font-size: 60px;
	font-weight: 400;
	line-height: 100%;
	margin-bottom: 24px;

	span {
		font-family: 'SF Pro Display';
		font-size: 60px;
		font-style: normal;
		font-weight: 510;
		line-height: 100%;
		letter-spacing: -1.5px;

		&.success {
			background: linear-gradient( 270deg, #349f4b 49.73%, #3858e9 100% );
			background-clip: text;
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
		}

		&.alert {
			background: linear-gradient( 270deg, #d63638 10.23%, #5200ff 100% );
			background-clip: text;
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
		}
	}
`;

const Subtitle = styled.span`
	cursor: pointer;
	color: var( --studio-gray-70 );
	font-family: 'SF Pro Text';
	font-size: 16px;
	font-style: normal;
	font-weight: 500;
	line-height: 28px;

	&:hover {
		text-decoration-line: underline;
		color: var( --studio-gray-80 );
	}
`;

const Content = styled.div`
	margin-top: 64px;
`;

export const MetricsSection = forwardRef< HTMLObjectElement, MetricsSectionProps >(
	( props, ref: ForwardedRef< HTMLObjectElement > ) => {
		const { name, title, subtitle, children } = props;

		return (
			<Container ref={ ref }>
				<NameSpan>{ name }</NameSpan>
				<Title>{ title }</Title>
				<Subtitle>{ subtitle }</Subtitle>

				{ children && <Content>{ children }</Content> }
			</Container>
		);
	}
);
