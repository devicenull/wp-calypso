import {
	isDomainMapping,
	isDomainRegistration,
	isDomainTransfer,
} from '@automattic/calypso-products';
import { FormStatus, useFormStatus } from '@automattic/composite-checkout';
import { useShoppingCart } from '@automattic/shopping-cart';
import { styled, joinClasses, hasCheckoutVersion } from '@automattic/wpcom-checkout';
import { useTranslate } from 'i18n-calypso';
import { useEffect, useCallback } from 'react';
import { hasP2PlusPlan } from 'calypso/lib/cart-values/cart-items';
import useCartKey from 'calypso/my-sites/checkout/use-cart-key';
import { useSelector, useDispatch } from 'calypso/state';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { NON_PRIMARY_DOMAINS_TO_FREE_USERS } from 'calypso/state/current-user/constants';
import { currentUserHasFlag, getCurrentUser } from 'calypso/state/current-user/selectors';
import getSelectedSite from 'calypso/state/ui/selectors/get-selected-site';
import Coupon from './coupon';
import { WPOrderReviewLineItems, WPOrderReviewSection } from './wp-order-review-line-items';
import type { OnChangeItemVariant } from './item-variation-picker';
import type { CouponFieldStateProps } from '../hooks/use-coupon-field-state';
import type { SiteDetails } from '@automattic/data-stores';
import type {
	ResponseCart,
	RemoveProductFromCart,
	ReplaceProductInCart,
	CouponStatus,
	SetCouponFieldVisible,
	RemoveCouponAndClearField,
} from '@automattic/shopping-cart';

const SiteSummary = styled.div`
	color: ${ ( props ) => props.theme.colors.textColorLight };
	font-size: 14px;
	margin-top: 0px;
	word-break: break-word;

	.is-summary & {
		margin-bottom: 10px;
	}

	@media ( ${ ( props ) => props.theme.breakpoints.tabletUp } ) {
		margin-top: -8px;
	}
`;

const CouponLinkWrapper = styled.div< { shouldUseCheckoutV2: boolean } >`
	${ ( props ) => ( props.shouldUseCheckoutV2 ? `font-size: 12px;` : `font-size: 14px;` ) }
`;

const CouponAreaWrapper = styled.div< { shouldUseCheckoutV2: boolean } >`
	padding-bottom: ${ ( props ) => ( props.shouldUseCheckoutV2 ? '12px' : 'inherit' ) };
	${ ( props ) => ( props.shouldUseCheckoutV2 ? '' : 'padding: 0 24px;' ) }
	@media ( ${ ( props ) => props.theme.breakpoints.tabletUp } ) {
		padding-inline-start: ${ ( props ) => ( props.shouldUseCheckoutV2 ? 'initial' : '40px' ) };
		padding-inline-end: ${ ( props ) => ( props.shouldUseCheckoutV2 ? 'initial' : '0' ) };
	}
	padding-top: ${ ( props ) => ( props.shouldUseCheckoutV2 ? 'initial' : '28px' ) };
	align-self: stretch;
`;

const CouponField = styled( Coupon )``;

const CouponEnableButton = styled.button< { shouldUseCheckoutV2: boolean } >`
	cursor: pointer;
	text-decoration: underline;
	color: ${ ( props ) =>
		props.shouldUseCheckoutV2 ? props.theme.colors.highlight : props.theme.colors.textColorLight };

	&.wp-checkout-order-review__show-coupon-field-button {
		${ ( props ) => ( props.shouldUseCheckoutV2 ? `font-size: 12px` : `font-size: 14px;` ) }
	}
	:hover {
		text-decoration: none;
	}
`;

export default function WPCheckoutOrderReview( {
	className,
	removeProductFromCart,
	removeCouponAndClearField,
	isCouponFieldVisible,
	setCouponFieldVisible,
	replaceProductInCart,
	couponFieldStateProps,
	onChangeSelection,
	siteUrl,
	isSummary,
	createUserAndSiteBeforeTransaction,
}: {
	className?: string;
	removeProductFromCart?: RemoveProductFromCart;
	replaceProductInCart: ReplaceProductInCart;
	couponFieldStateProps: CouponFieldStateProps;
	onChangeSelection?: OnChangeItemVariant;
	removeCouponAndClearField: RemoveCouponAndClearField;
	isCouponFieldVisible: boolean;
	setCouponFieldVisible: SetCouponFieldVisible;
	siteUrl?: string;
	isSummary?: boolean;
	createUserAndSiteBeforeTransaction?: boolean;
} ) {
	const translate = useTranslate();
	const cartKey = useCartKey();
	const { responseCart, couponStatus } = useShoppingCart( cartKey );
	const isPurchaseFree = responseCart.total_cost_integer === 0;
	const reduxDispatch = useDispatch();
	const shouldUseCheckoutV2 = hasCheckoutVersion( '2' );

	const onRemoveProductCancel = useCallback( () => {
		reduxDispatch( recordTracksEvent( 'calypso_checkout_composite_cancel_delete_product' ) );
	}, [ reduxDispatch ] );
	const onRemoveProduct = useCallback(
		( label: string ) => {
			reduxDispatch(
				recordTracksEvent( 'calypso_checkout_composite_delete_product', {
					product_name: label,
				} )
			);
		},
		[ reduxDispatch ]
	);
	const onRemoveProductClick = useCallback(
		( label: string ) => {
			reduxDispatch(
				recordTracksEvent( 'calypso_checkout_composite_delete_product_press', {
					product_name: label,
				} )
			);
		},
		[ reduxDispatch ]
	);

	const selectedSiteData = useSelector( getSelectedSite );

	// This is what will be displayed at the top of checkout prefixed by "Site: ".
	const domainUrl = getDomainToDisplayInCheckoutHeader( responseCart, selectedSiteData, siteUrl );

	const planIsP2Plus = hasP2PlusPlan( responseCart );

	const isPwpoUser = useSelector(
		( state ) =>
			getCurrentUser( state ) && currentUserHasFlag( state, NON_PRIMARY_DOMAINS_TO_FREE_USERS )
	);

	return (
		<>
			<div
				className={ joinClasses( [
					className,
					'checkout-review-order',
					isSummary && 'is-summary',
				] ) }
			>
				{ domainUrl && <SiteSummary>{ translate( 'Site: %s', { args: domainUrl } ) }</SiteSummary> }
				{ planIsP2Plus && selectedSiteData?.name && (
					<SiteSummary>
						{ translate( 'Upgrade: {{strong}}%s{{/strong}}', {
							args: selectedSiteData.name,
							components: {
								strong: <strong />,
							},
						} ) }
					</SiteSummary>
				) }

				<WPOrderReviewSection>
					<WPOrderReviewLineItems
						removeProductFromCart={ removeProductFromCart }
						replaceProductInCart={ replaceProductInCart }
						removeCoupon={ removeCouponAndClearField }
						onChangeSelection={ onChangeSelection }
						isSummary={ isSummary }
						createUserAndSiteBeforeTransaction={ createUserAndSiteBeforeTransaction }
						responseCart={ responseCart }
						isPwpoUser={ isPwpoUser ?? false }
						onRemoveProduct={ onRemoveProduct }
						onRemoveProductClick={ onRemoveProductClick }
						onRemoveProductCancel={ onRemoveProductCancel }
					/>
				</WPOrderReviewSection>

				{ shouldUseCheckoutV2 && (
					<CouponFieldArea
						isCouponFieldVisible={ isCouponFieldVisible }
						setCouponFieldVisible={ setCouponFieldVisible }
						isPurchaseFree={ isPurchaseFree }
						couponStatus={ couponStatus }
						couponFieldStateProps={ couponFieldStateProps }
					/>
				) }
			</div>
		</>
	);
}

export function CouponFieldArea( {
	isCouponFieldVisible,
	setCouponFieldVisible,
	isPurchaseFree,
	couponStatus,
	couponFieldStateProps,
}: {
	isCouponFieldVisible: boolean;
	setCouponFieldVisible: ( visible: boolean ) => void;
	isPurchaseFree: boolean;
	couponStatus: CouponStatus;
	couponFieldStateProps: CouponFieldStateProps;
} ) {
	const { formStatus } = useFormStatus();
	const translate = useTranslate();
	const { setCouponFieldValue } = couponFieldStateProps;
	const shouldUseCheckoutV2 = hasCheckoutVersion( '2' );

	useEffect( () => {
		if ( couponStatus === 'applied' ) {
			// Clear the field value when the coupon is applied
			setCouponFieldValue( '' );
		}
	}, [ couponStatus, setCouponFieldValue ] );

	if ( isPurchaseFree || couponStatus === 'applied' ) {
		return null;
	}

	if ( isCouponFieldVisible ) {
		return (
			<CouponAreaWrapper shouldUseCheckoutV2={ shouldUseCheckoutV2 }>
				<CouponField
					id="order-review-coupon"
					disabled={ formStatus !== FormStatus.READY }
					couponStatus={ couponStatus }
					couponFieldStateProps={ couponFieldStateProps }
				/>
			</CouponAreaWrapper>
		);
	}

	return (
		<CouponAreaWrapper shouldUseCheckoutV2={ shouldUseCheckoutV2 }>
			<CouponLinkWrapper shouldUseCheckoutV2={ shouldUseCheckoutV2 }>
				<CouponEnableButton
					className="wp-checkout-order-review__show-coupon-field-button"
					onClick={ () => setCouponFieldVisible( true ) }
					shouldUseCheckoutV2={ shouldUseCheckoutV2 }
				>
					{ translate( 'Have a coupon?' ) }
				</CouponEnableButton>
			</CouponLinkWrapper>
		</CouponAreaWrapper>
	);
}

function getDomainToDisplayInCheckoutHeader(
	responseCart: ResponseCart,
	selectedSiteData: SiteDetails | undefined | null,
	sitelessCheckoutSlug: string | undefined
): string | undefined {
	if ( hasP2PlusPlan( responseCart ) ) {
		return undefined;
	}

	const primaryDomainForMapping = selectedSiteData?.options?.is_mapped_domain
		? selectedSiteData?.domain
		: undefined;
	if ( primaryDomainForMapping ) {
		return primaryDomainForMapping;
	}

	const domainUrl = getDomainProductUrlToDisplayInCheckoutHeader( responseCart, selectedSiteData );
	if ( domainUrl ) {
		return domainUrl;
	}

	if ( responseCart.gift_details?.receiver_blog_url ) {
		return responseCart.gift_details.receiver_blog_url;
	}

	if (
		sitelessCheckoutSlug &&
		sitelessCheckoutSlug !== 'no-user' &&
		sitelessCheckoutSlug !== 'no-site'
	) {
		return sitelessCheckoutSlug;
	}

	return undefined;
}

function getDomainProductUrlToDisplayInCheckoutHeader(
	responseCart: ResponseCart,
	selectedSiteData: SiteDetails | undefined | null
): string | undefined {
	const domainProducts = responseCart.products.filter(
		( product ) =>
			isDomainTransfer( product ) || isDomainRegistration( product ) || isDomainMapping( product )
	);

	const firstDomainProduct = domainProducts.length > 0 ? domainProducts[ 0 ] : undefined;

	const isPurchaseSiteless = ! selectedSiteData;

	if ( ! firstDomainProduct?.meta ) {
		return undefined;
	}

	if ( isPurchaseSiteless && domainProducts.length > 1 ) {
		return undefined;
	}

	return firstDomainProduct.meta;
}
