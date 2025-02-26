import { Button, Gridicon } from '@automattic/components';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import safeProtocolUrl from 'calypso/lib/safe-protocol-url';
import { withoutHttp } from 'calypso/lib/url';
import { recordGoogleEvent } from 'calypso/state/analytics/actions';

import './style.scss';

class ProfileLink extends Component {
	static defaultProps = {
		imageSize: 100,
		title: '',
		url: '',
		slug: '',
		isPlaceholder: false,
	};

	static propTypes = {
		imageSize: PropTypes.number,
		title: PropTypes.string.isRequired,
		url: PropTypes.string.isRequired,
		slug: PropTypes.string.isRequired,
	};

	recordClickEvent = ( action ) => {
		this.props.recordGoogleEvent( 'Me', 'Clicked on ' + action );
	};

	getClickHandler = ( action ) => {
		return () => this.recordClickEvent( action );
	};

	handleRemoveButtonClick = () => {
		this.recordClickEvent( 'Remove Link Next to Site' );
		this.props.onRemoveLink();
	};

	renderRemove() {
		return (
			<Button borderless className="profile-link__remove" onClick={ this.handleRemoveButtonClick }>
				<Gridicon icon="cross" />
			</Button>
		);
	}

	render() {
		const classes = classNames( {
			'profile-link': true,
			'is-placeholder': this.props.isPlaceholder,
		} );
		const imageSrc =
			'//s1.wp.com/mshots/v1/' +
			encodeURIComponent( this.props.url ) +
			'?w=' +
			this.props.imageSize +
			'&h=64';
		const linkHref = this.props.isPlaceholder ? null : safeProtocolUrl( this.props.url );

		return (
			<li className={ classes }>
				{ this.props.isPlaceholder ? (
					<div className="profile-link__image-link" />
				) : (
					<a
						href={ linkHref }
						className="profile-link__image-link"
						target="_blank"
						rel="noopener noreferrer"
						onClick={ this.getClickHandler( 'Profile Links Site Images Link' ) }
					>
						{ /* eslint-disable-next-line jsx-a11y/alt-text */ }
						<img className="profile-link__image" src={ imageSrc } />
					</a>
				) }
				<a
					href={ linkHref }
					target="_blank"
					rel="noopener noreferrer"
					onClick={ this.getClickHandler( 'Profile Links Site Link' ) }
				>
					<span className="profile-link__title">{ this.props.title }</span>
					<span className="profile-link__url">{ withoutHttp( this.props.url ) }</span>
				</a>

				{ this.props.isPlaceholder ? null : this.renderRemove() }
			</li>
		);
	}
}

export default connect( null, {
	recordGoogleEvent,
} )( ProfileLink );
