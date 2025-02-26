import config from '@automattic/calypso-config';
import { HelpCenter } from '@automattic/data-stores';
import { shouldLoadInlineHelp } from '@automattic/help-center';
import { isWithinBreakpoint, subscribeIsWithinBreakpoint } from '@automattic/viewport';
import { useBreakpoint } from '@automattic/viewport-react';
import WhatsNewGuide, { useShouldShowCriticalAnnouncementsQuery } from '@automattic/whats-new';
import { useDispatch } from '@wordpress/data';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { Component, useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import QueryAgencies from 'calypso/a8c-for-agencies/data/agencies/query-agencies';
import AsyncLoad from 'calypso/components/async-load';
import DocumentHead from 'calypso/components/data/document-head';
import QueryPreferences from 'calypso/components/data/query-preferences';
import QuerySiteAdminColor from 'calypso/components/data/query-site-admin-color';
import QuerySiteFeatures from 'calypso/components/data/query-site-features';
import QuerySiteSelectedEditor from 'calypso/components/data/query-site-selected-editor';
import QuerySites from 'calypso/components/data/query-sites';
import JetpackCloudMasterbar from 'calypso/components/jetpack/masterbar';
import { withCurrentRoute } from 'calypso/components/route';
import SympathyDevWarning from 'calypso/components/sympathy-dev-warning';
import { useSiteExcerptsSorted } from 'calypso/data/sites/use-site-excerpts-sorted';
import { retrieveMobileRedirect } from 'calypso/jetpack-connect/persistence-utils';
import wooDnaConfig from 'calypso/jetpack-connect/woo-dna-config';
import HtmlIsIframeClassname from 'calypso/layout/html-is-iframe-classname';
import EmptyMasterbar from 'calypso/layout/masterbar/empty';
import MasterbarLoggedIn from 'calypso/layout/masterbar/logged-in';
import WooCoreProfilerMasterbar from 'calypso/layout/masterbar/woo-core-profiler';
import OfflineStatus from 'calypso/layout/offline-status';
import isA8CForAgencies from 'calypso/lib/a8c-for-agencies/is-a8c-for-agencies';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import { isWcMobileApp, isWpMobileApp } from 'calypso/lib/mobile-app';
import { navigate } from 'calypso/lib/navigate';
import isReaderTagEmbedPage from 'calypso/lib/reader/is-reader-tag-embed-page';
import { getMessagePathForJITM } from 'calypso/lib/route';
import UserVerificationChecker from 'calypso/lib/user/verification-checker';
import { useCommandsCalypso } from 'calypso/sites-dashboard/components/wpcom-smp-commands';
import { getAdminColor } from 'calypso/state/admin-color/selectors';
import { isOffline } from 'calypso/state/application/selectors';
import { closeCommandPalette } from 'calypso/state/command-palette/actions';
import { isCommandPaletteOpen as getIsCommandPaletteOpen } from 'calypso/state/command-palette/selectors';
import { isUserLoggedIn } from 'calypso/state/current-user/selectors';
import {
	getShouldShowCollapsedGlobalSidebar,
	getShouldShowGlobalSidebar,
	getShouldShowUnifiedSiteSidebar,
} from 'calypso/state/global-sidebar/selectors';
import { isUserNewerThan, WEEK_IN_MILLISECONDS } from 'calypso/state/guided-tours/contexts';
import { getCurrentOAuth2Client } from 'calypso/state/oauth2-clients/ui/selectors';
import { getPreference } from 'calypso/state/preferences/selectors';
import getCurrentQueryArguments from 'calypso/state/selectors/get-current-query-arguments';
import { getCurrentRoutePattern } from 'calypso/state/selectors/get-current-route-pattern';
import isAtomicSite from 'calypso/state/selectors/is-site-automated-transfer';
import isWooCommerceCoreProfilerFlow from 'calypso/state/selectors/is-woocommerce-core-profiler-flow';
import { isJetpackSite } from 'calypso/state/sites/selectors';
import { isSupportSession } from 'calypso/state/support/selectors';
import { getCurrentLayoutFocus } from 'calypso/state/ui/layout-focus/selectors';
import {
	getSelectedSiteId,
	getSidebarIsCollapsed,
	masterbarIsVisible,
} from 'calypso/state/ui/selectors';
import BodySectionCssClass from './body-section-css-class';
import GlobalNotifications from './global-notifications';
import LayoutLoader from './loader';
import { handleScroll } from './utils';
// goofy import for environment badge, which is SSR'd
import 'calypso/components/environment-badge/style.scss';

/*
 * Hotfix for card and button styles hierarchy after <GdprBanner /> removal (see: #70601)
 * TODO: Find a way to improve our async loading that will not require these imports in the global scope (context: pbNhbs-4xL-p2)
 */
import '@automattic/components/src/button/style.scss';
import '@automattic/components/src/card/style.scss';

import './style.scss';

const HELP_CENTER_STORE = HelpCenter.register();

function SidebarScrollSynchronizer() {
	const isNarrow = useBreakpoint( '<660px' );
	const active = ! isNarrow && ! config.isEnabled( 'jetpack-cloud' ); // Jetpack cloud hasn't yet aligned with WPCOM.

	useEffect( () => {
		if ( active ) {
			window.addEventListener( 'scroll', handleScroll );
			window.addEventListener( 'resize', handleScroll );
		}

		return () => {
			if ( active ) {
				window.removeEventListener( 'scroll', handleScroll );
				window.removeEventListener( 'resize', handleScroll );

				// remove style attributes added by `handleScroll`
				document.getElementById( 'content' )?.removeAttribute( 'style' );
				document.getElementById( 'secondary' )?.removeAttribute( 'style' );
			}
		};
	}, [ active ] );

	return null;
}

function WhatsNewLoader( { loadWhatsNew, siteId } ) {
	const { data: shouldShowCriticalAnnouncements, isLoading } =
		useShouldShowCriticalAnnouncementsQuery( siteId );
	const [ showWhatsNew, setShowWhatsNew ] = useState( false );

	useEffect( () => {
		if ( ! isLoading && shouldShowCriticalAnnouncements ) {
			setShowWhatsNew( true );
		}
	}, [ shouldShowCriticalAnnouncements, isLoading ] );

	const handleClose = useCallback( () => {
		setShowWhatsNew( false );
	}, [ setShowWhatsNew ] );

	if ( ! loadWhatsNew ) {
		return null;
	}

	return showWhatsNew && <WhatsNewGuide onClose={ handleClose } siteId={ siteId } />;
}

function HelpCenterLoader( { sectionName, loadHelpCenter, currentRoute } ) {
	const { setShowHelpCenter } = useDispatch( HELP_CENTER_STORE );
	const isDesktop = useBreakpoint( '>782px' );
	const handleClose = useCallback( () => {
		setShowHelpCenter( false );
	}, [ setShowHelpCenter ] );

	if ( ! loadHelpCenter ) {
		return null;
	}

	return (
		<AsyncLoad
			require="@automattic/help-center"
			placeholder={ null }
			handleClose={ handleClose }
			currentRoute={ currentRoute }
			// hide Calypso's version of the help-center on Desktop, because the Editor has its own help-center
			hidden={ sectionName === 'gutenberg-editor' && isDesktop }
		/>
	);
}

function SidebarOverflowDelay( { layoutFocus } ) {
	const setSidebarOverflowClass = ( overflow ) => {
		const classList = document.querySelector( 'body' ).classList;
		if ( overflow ) {
			classList.add( 'is-sidebar-overflow' );
		} else {
			classList.remove( 'is-sidebar-overflow' );
		}
	};

	useEffect( () => {
		if ( layoutFocus !== 'sites' ) {
			// The sidebar menu uses a flyout design that requires the overflowing content
			// to be visible. However, `overflow` isn't an animatable CSS property, so we
			// need to set it after the sliding transition finishes. We wait for 150ms (the
			// CSS transition time) + a grace period of 350ms (since the sidebar menu is
			// rendered asynchronously).
			// @see https://github.com/Automattic/wp-calypso/issues/47019
			setTimeout( () => {
				setSidebarOverflowClass( true );
			}, 500 );
		} else {
			setSidebarOverflowClass( false );
		}
	}, [ layoutFocus ] );

	return null;
}

function AppBannerLoader( { siteId } ) {
	const { data: shouldShowCriticalAnnouncements, isLoading } =
		useShouldShowCriticalAnnouncementsQuery( siteId );
	const [ showWhatsNew, setShowWhatsNew ] = useState( false );

	useEffect( () => {
		if ( ! isLoading && shouldShowCriticalAnnouncements ) {
			setShowWhatsNew( true );
		}
	}, [ shouldShowCriticalAnnouncements, isLoading ] );

	return (
		! isLoading &&
		! showWhatsNew && <AsyncLoad require="calypso/blocks/app-banner" placeholder={ null } />
	);
}

class Layout extends Component {
	static propTypes = {
		primary: PropTypes.element,
		secondary: PropTypes.element,
		focus: PropTypes.object,
		// connected props
		masterbarIsHidden: PropTypes.bool,
		isSupportSession: PropTypes.bool,
		isOffline: PropTypes.bool,
		sectionGroup: PropTypes.string,
		sectionName: PropTypes.string,
		colorScheme: PropTypes.string,
	};

	constructor( props ) {
		super( props );
		this.state = {
			isDesktop: isWithinBreakpoint( '>=782px' ),
		};
	}

	componentDidMount() {
		this.unsubscribe = subscribeIsWithinBreakpoint( '>=782px', ( isDesktop ) => {
			this.setState( { isDesktop } );
		} );

		this.refreshColorScheme( undefined, this.props.colorScheme );
		this.addSidebarClassToBody();
	}

	/**
	 * Refresh the color scheme if
	 * - the color scheme has changed
	 * - the global sidebar is visible and the color scheme is not `modern`
	 * - the global sidebar was visible and is now hidden and the color scheme is not `modern`
	 * @param prevProps object
	 */
	componentDidUpdate( prevProps ) {
		if (
			prevProps.colorScheme !== this.props.colorScheme ||
			( this.props.isGlobalSidebarVisible && this.props.colorScheme !== 'modern' ) ||
			( prevProps.isGlobalSidebarVisible &&
				! this.props.isGlobalSidebarVisible &&
				this.props.colorScheme !== 'modern' )
		) {
			this.refreshColorScheme( prevProps.colorScheme, this.props.colorScheme );
		}

		if (
			prevProps.isGlobalSidebarVisible !== this.props.isGlobalSidebarVisible ||
			prevProps.isGlobalSidebarCollapsed !== this.props.isGlobalSidebarCollapsed
		) {
			this.addSidebarClassToBody();
		}
	}

	addSidebarClassToBody() {
		if ( typeof document === 'undefined' ) {
			return;
		}

		if ( this.props.isGlobalSidebarVisible ) {
			document.querySelector( 'body' ).classList.add( 'has-global-sidebar' );
		} else {
			document.querySelector( 'body' ).classList.remove( 'has-global-sidebar' );
		}

		if ( this.props.isGlobalSidebarCollapsed ) {
			document.querySelector( 'body' ).classList.add( 'has-global-sidebar-collapsed' );
		} else {
			document.querySelector( 'body' ).classList.remove( 'has-global-sidebar-collapsed' );
		}
	}

	refreshColorScheme( prevColorScheme, nextColorScheme ) {
		if ( ! config.isEnabled( 'me/account/color-scheme-picker' ) ) {
			return;
		}

		if ( typeof document !== 'undefined' ) {
			const classList = document.querySelector( 'body' ).classList;

			// We only want to apply the `modern` color scheme when the global sidebar is visible
			if ( this.props.isGlobalSidebarVisible && nextColorScheme !== 'modern' ) {
				// Remove the color scheme in case it was set before
				classList.remove( `is-${ nextColorScheme }` );
				nextColorScheme = 'modern';
			}

			classList.remove( `is-${ prevColorScheme }` );
			classList.add( `is-${ nextColorScheme }` );

			const themeColor = getComputedStyle( document.body )
				.getPropertyValue( '--color-masterbar-background' )
				.trim();
			const themeColorMeta = document.querySelector( 'meta[name="theme-color"]' );
			// We only adjust the `theme-color` meta content value in case we set it in `componentDidMount`
			if ( themeColorMeta && themeColorMeta.getAttribute( 'data-colorscheme' ) === 'true' ) {
				themeColorMeta.content = themeColor;
			}
		}

		// intentionally don't remove these in unmount
	}

	renderMasterbar( loadHelpCenterIcon ) {
		const globalSidebarDesktop = this.state.isDesktop && this.props.isGlobalSidebarVisible;
		if ( this.props.masterbarIsHidden || globalSidebarDesktop ) {
			return <EmptyMasterbar />;
		}
		if ( this.props.isWooCoreProfilerFlow ) {
			return <WooCoreProfilerMasterbar />;
		}

		const MasterbarComponent = config.isEnabled( 'jetpack-cloud' )
			? JetpackCloudMasterbar
			: MasterbarLoggedIn;

		const isCheckoutFailed =
			this.props.sectionName === 'checkout' &&
			this.props.currentRoute.startsWith( '/checkout/failed-purchases' );

		return (
			<MasterbarComponent
				section={ this.props.sectionGroup }
				isCheckout={ this.props.sectionName === 'checkout' }
				isCheckoutPending={ this.props.sectionName === 'checkout-pending' }
				isCheckoutFailed={ isCheckoutFailed }
				loadHelpCenterIcon={ loadHelpCenterIcon }
			/>
		);
	}

	render() {
		const globalSidebarDesktop = this.state.isDesktop && this.props.isGlobalSidebarVisible;
		const sectionClass = classnames( 'layout', `focus-${ this.props.currentLayoutFocus }`, {
			[ 'is-group-' + this.props.sectionGroup ]: this.props.sectionGroup,
			[ 'is-section-' + this.props.sectionName ]: this.props.sectionName,
			'is-support-session': this.props.isSupportSession,
			'has-no-sidebar': this.props.sidebarIsHidden,
			'has-no-masterbar': this.props.masterbarIsHidden || globalSidebarDesktop,
			'is-logged-in': this.props.isLoggedIn,
			'is-jetpack-login': this.props.isJetpackLogin,
			'is-jetpack-site': this.props.isJetpack,
			'is-jetpack-mobile-flow': this.props.isJetpackMobileFlow,
			'is-jetpack-woocommerce-flow': this.props.isJetpackWooCommerceFlow,
			'is-jetpack-woo-dna-flow': this.props.isJetpackWooDnaFlow,
			'is-woocommerce-core-profiler-flow': this.props.isWooCoreProfilerFlow,
			'is-automattic-for-agencies-flow': this.props.isFromAutomatticForAgenciesPlugin,
			woo: this.props.isWooCoreProfilerFlow,
			'is-global-sidebar-visible': this.props.isGlobalSidebarVisible,
			'is-global-sidebar-collapsed': this.props.isGlobalSidebarCollapsed,
			'is-unified-site-sidebar-visible': this.props.isUnifiedSiteSidebarVisible,
		} );

		const optionalBodyProps = () => {
			const bodyClass = [ 'font-smoothing-antialiased' ];

			if ( this.props.sidebarIsCollapsed && isWithinBreakpoint( '>800px' ) ) {
				bodyClass.push( 'is-sidebar-collapsed' );
			}

			return {
				bodyClass,
			};
		};

		const loadHelpCenter =
			// we want to show only the Help center in my home and the help section (but not the FAB)
			( [ 'home', 'help' ].includes( this.props.sectionName ) ||
				shouldLoadInlineHelp( this.props.sectionName, this.props.currentRoute ) ) &&
			this.props.userAllowedToHelpCenter;

		const shouldDisableSidebarScrollSynchronizer =
			this.props.isGlobalSidebarVisible || this.props.isGlobalSidebarCollapsed;

		const shouldEnableCommandPalette =
			// There is a custom command palette in the "Switch site" page, so we disable it.
			config.isEnabled( 'yolo/command-palette' ) && this.props.currentRoute !== '/switch-site';

		return (
			<div className={ sectionClass }>
				<WhatsNewLoader
					loadWhatsNew={ loadHelpCenter && ! this.props.sidebarIsHidden && ! this.props.isNewUser }
					siteId={ this.props.siteId }
				/>
				<HelpCenterLoader
					sectionName={ this.props.sectionName }
					loadHelpCenter={ loadHelpCenter }
					currentRoute={ this.props.currentRoute }
				/>
				{ ! shouldDisableSidebarScrollSynchronizer && (
					<SidebarScrollSynchronizer layoutFocus={ this.props.currentLayoutFocus } />
				) }
				<SidebarOverflowDelay layoutFocus={ this.props.currentLayoutFocus } />
				<BodySectionCssClass
					layoutFocus={ this.props.currentLayoutFocus }
					group={ this.props.sectionGroup }
					section={ this.props.sectionName }
					{ ...optionalBodyProps() }
				/>
				<HtmlIsIframeClassname />
				<DocumentHead />
				<QuerySites primaryAndRecent={ ! config.isEnabled( 'jetpack-cloud' ) } />
				{ this.props.shouldQueryAllSites && <QuerySites allSites /> }
				<QueryPreferences />
				<QuerySiteFeatures siteIds={ [ this.props.siteId ] } />
				{ this.props.isUnifiedSiteSidebarVisible && (
					<QuerySiteAdminColor siteId={ this.props.siteId } />
				) }
				{ config.isEnabled( 'layout/query-selected-editor' ) && (
					<QuerySiteSelectedEditor siteId={ this.props.siteId } />
				) }
				<UserVerificationChecker />
				{ config.isEnabled( 'layout/guided-tours' ) && (
					<AsyncLoad require="calypso/layout/guided-tours" placeholder={ null } />
				) }
				<div className="layout__header-section">{ this.renderMasterbar( loadHelpCenter ) }</div>
				<LayoutLoader />
				{ isJetpackCloud() && (
					<AsyncLoad require="calypso/jetpack-cloud/style" placeholder={ null } />
				) }
				{ isA8CForAgencies() && (
					<>
						<AsyncLoad require="calypso/a8c-for-agencies/style" placeholder={ null } />
						<QueryAgencies />
					</>
				) }
				{ this.props.isOffline && <OfflineStatus /> }
				<div id="content" className="layout__content">
					{ config.isEnabled( 'jitms' ) && this.props.isEligibleForJITM && (
						<AsyncLoad
							require="calypso/blocks/jitm"
							placeholder={ null }
							messagePath={ `calypso:${ this.props.sectionJitmPath }:admin_notices` }
						/>
					) }
					<AsyncLoad
						require="calypso/components/global-notices"
						placeholder={ null }
						id="notices"
					/>
					<div id="secondary" className="layout__secondary" role="navigation">
						{ this.props.secondary }
					</div>
					<div id="primary" className="layout__primary">
						{ this.props.primary }
					</div>
				</div>
				<AsyncLoad require="calypso/layout/community-translator" placeholder={ null } />
				{ 'development' === process.env.NODE_ENV && (
					<>
						<SympathyDevWarning />
						<AsyncLoad require="calypso/components/webpack-build-monitor" placeholder={ null } />
					</>
				) }
				{ config.isEnabled( 'layout/support-article-dialog' ) && (
					<AsyncLoad require="calypso/blocks/support-article-dialog" placeholder={ null } />
				) }
				{ config.isEnabled( 'layout/app-banner' ) && (
					<AppBannerLoader siteId={ this.props.siteId } />
				) }
				{ config.isEnabled( 'cookie-banner' ) && (
					<AsyncLoad require="calypso/blocks/cookie-banner" placeholder={ null } />
				) }
				{ config.isEnabled( 'legal-updates-banner' ) && (
					<AsyncLoad require="calypso/blocks/legal-updates-banner" placeholder={ null } />
				) }
				<GlobalNotifications />
				{ shouldEnableCommandPalette && (
					<AsyncLoad
						require="@automattic/command-palette"
						placeholder={ null }
						isOpenGlobal={ this.props.isCommandPaletteOpen }
						onClose={ this.props.closeCommandPalette }
						currentSiteId={ this.props.siteId }
						navigate={ navigate }
						useCommands={ useCommandsCalypso }
						currentRoute={ this.props.currentRoutePattern }
						useSites={ useSiteExcerptsSorted }
						userCapabilities={ this.props.userCapabilities }
					/>
				) }
			</div>
		);
	}
}

export default withCurrentRoute(
	connect(
		( state, { currentSection, currentRoute, currentQuery, secondary } ) => {
			const sectionGroup = currentSection?.group ?? null;
			const sectionName = currentSection?.name ?? null;
			const siteId = getSelectedSiteId( state );
			const sectionJitmPath = getMessagePathForJITM( currentRoute );
			const isJetpackLogin = currentRoute.startsWith( '/log-in/jetpack' );
			const isDomainAndPlanPackageFlow = !! getCurrentQueryArguments( state )?.domainAndPlanPackage;
			const isJetpack =
				( isJetpackSite( state, siteId ) && ! isAtomicSite( state, siteId ) ) ||
				currentRoute.startsWith( '/checkout/jetpack' );
			const isWooCoreProfilerFlow =
				[ 'jetpack-connect', 'login' ].includes( sectionName ) &&
				isWooCommerceCoreProfilerFlow( state );
			const shouldShowGlobalSidebar = getShouldShowGlobalSidebar(
				state,
				siteId,
				sectionGroup,
				sectionName
			);
			const shouldShowCollapsedGlobalSidebar = getShouldShowCollapsedGlobalSidebar(
				state,
				siteId,
				sectionGroup,
				sectionName
			);
			const shouldShowUnifiedSiteSidebar = getShouldShowUnifiedSiteSidebar(
				state,
				siteId,
				sectionGroup,
				sectionName
			);
			const noMasterbarForRoute =
				isJetpackLogin ||
				currentRoute === '/me/account/closed' ||
				isDomainAndPlanPackageFlow ||
				isReaderTagEmbedPage( window?.location );
			const noMasterbarForSection =
				// hide the masterBar until the section is loaded. To flicker the masterBar in, is better than to flicker it out.
				! sectionName ||
				( ! isWooCoreProfilerFlow && [ 'signup', 'jetpack-connect' ].includes( sectionName ) );
			const isFromAutomatticForAgenciesPlugin =
				'automattic-for-agencies-client' === currentQuery?.from;
			const masterbarIsHidden =
				! masterbarIsVisible( state ) ||
				noMasterbarForSection ||
				noMasterbarForRoute ||
				isWpMobileApp() ||
				isWcMobileApp() ||
				isJetpackCloud() ||
				isA8CForAgencies();
			const isJetpackMobileFlow = 'jetpack-connect' === sectionName && !! retrieveMobileRedirect();
			const isJetpackWooCommerceFlow =
				[ 'jetpack-connect', 'login' ].includes( sectionName ) &&
				'woocommerce-onboarding' === currentQuery?.from;
			const isJetpackWooDnaFlow =
				[ 'jetpack-connect', 'login' ].includes( sectionName ) &&
				wooDnaConfig( currentQuery ).isWooDnaFlow();
			const oauth2Client = getCurrentOAuth2Client( state );
			const wccomFrom = currentQuery?.[ 'wccom-from' ];
			const isEligibleForJITM = [
				'home',
				'stats',
				'plans',
				'themes',
				'plugins',
				'comments',
			].includes( sectionName );
			const sidebarIsHidden = ! secondary || isWcMobileApp() || isDomainAndPlanPackageFlow;
			const userAllowedToHelpCenter = config.isEnabled( 'calypso/help-center' );
			const isCommandPaletteOpen = getIsCommandPaletteOpen( state );

			const calypsoColorScheme = getPreference( state, 'colorScheme' );
			const siteColorScheme = getAdminColor( state, siteId ) ?? calypsoColorScheme;
			const colorScheme = shouldShowUnifiedSiteSidebar ? siteColorScheme : calypsoColorScheme;

			return {
				masterbarIsHidden,
				sidebarIsHidden,
				isCommandPaletteOpen,
				isJetpack,
				isJetpackLogin,
				isJetpackWooCommerceFlow,
				isJetpackWooDnaFlow,
				isJetpackMobileFlow,
				isWooCoreProfilerFlow,
				isFromAutomatticForAgenciesPlugin,
				isEligibleForJITM,
				oauth2Client,
				wccomFrom,
				isLoggedIn: isUserLoggedIn( state ),
				isSupportSession: isSupportSession( state ),
				sectionGroup,
				sectionName,
				sectionJitmPath,
				isOffline: isOffline( state ),
				currentLayoutFocus: getCurrentLayoutFocus( state ),
				colorScheme,
				siteId,
				// We avoid requesting sites in the Jetpack Connect authorization step, because this would
				// request all sites before authorization has finished. That would cause the "all sites"
				// request to lack the newly authorized site, and when the request finishes after
				// authorization, it would remove the newly connected site that has been fetched separately.
				// See https://github.com/Automattic/wp-calypso/pull/31277 for more details.
				shouldQueryAllSites: currentRoute && currentRoute !== '/jetpack/connect/authorize',
				sidebarIsCollapsed: sectionName !== 'reader' && getSidebarIsCollapsed( state ),
				userAllowedToHelpCenter,
				currentRoute,
				isGlobalSidebarVisible: shouldShowGlobalSidebar && ! sidebarIsHidden,
				isGlobalSidebarCollapsed: shouldShowCollapsedGlobalSidebar && ! sidebarIsHidden,
				isUnifiedSiteSidebarVisible: shouldShowUnifiedSiteSidebar && ! sidebarIsHidden,
				currentRoutePattern: getCurrentRoutePattern( state ) ?? '',
				userCapabilities: state.currentUser.capabilities,
				isNewUser: isUserNewerThan( WEEK_IN_MILLISECONDS )( state ),
			};
		},
		{
			closeCommandPalette,
		}
	)( Layout )
);
